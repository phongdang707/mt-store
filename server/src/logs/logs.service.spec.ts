import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { AppLog } from './log.schema.js';
import { LogsService } from './logs.service.js';
import { PersistLogger } from './persist-logger.js';
import { openRequest, requestLog, type RequestLogState } from './request-log.js';

type Doc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

function matches(doc: Doc, filter: Record<string, unknown>) {
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const cond = value as { $gte?: Date; $in?: unknown[] };
      if (cond.$gte && new Date(doc[key] as string).getTime() < new Date(cond.$gte).getTime()) return false;
      if (cond.$in && !cond.$in.includes(doc[key])) return false;
      continue;
    }
    if (doc[key] !== value) return false;
  }
  return true;
}

function memory() {
  const docs: Doc[] = [];
  const model = {
    async create(data: Record<string, unknown>) {
      const doc: Doc = { ...data, _id: new mongoose.Types.ObjectId() };
      docs.push(doc);
      return doc;
    },
    find(filter: Record<string, unknown>) {
      let rows = docs.filter((d) => matches(d, filter));
      const api = {
        sort(spec: { at?: number }) {
          if (spec.at === -1) rows = [...rows].sort((a, b) => new Date(b.at as string).getTime() - new Date(a.at as string).getTime());
          return api;
        },
        limit(n: number) {
          rows = rows.slice(0, n);
          return api;
        },
        select() {
          return api;
        },
        lean() {
          return api;
        },
        exec: async () => rows.map((d) => ({ ...d })),
      };
      return api;
    },
  };
  return { docs, logs: new LogsService(model as unknown as Model<AppLog>) };
}

function finished(state: RequestLogState, over: Partial<{ status: number; method: string; path: string; ms: number }> = {}) {
  return {
    status: over.status ?? 200,
    method: over.method ?? 'GET',
    path: over.path ?? '/api/orders',
    ms: over.ms ?? 12,
    state,
  };
}

describe('LogsService', () => {
  it('ghi request 200 với actor, rid, ms và OK', async () => {
    const { docs, logs } = memory();
    const state = openRequest(false);
    state.actor = 'a@b.c';
    state.rid = 'abc123';
    await logs.recordFinished(finished(state, { status: 200, ms: 12 }));
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ level: 'info', source: 'http', status: 200, method: 'GET', path: '/api/orders', message: 'OK', actor: 'a@b.c', rid: 'abc123', ms: 12 });
    expect(docs[0].fingerprint).toBeUndefined();
    expect(docs[0].stack).toBeUndefined();
  });

  it('hai warn trong một request nằm trong notes của một dòng', async () => {
    const { docs, logs } = memory();
    const logger = new PersistLogger(logs);
    const state = openRequest(false);
    await requestLog.run(state, async () => {
      logger.warn('một', 'ZaloService');
      logger.warn('hai', 'ZaloService');
    });
    await logs.recordFinished(finished(state, { status: 200, method: 'POST', path: '/api/orders' }));
    expect(docs).toHaveLength(1);
    expect(docs[0].message).toBe('OK');
    expect(docs[0].notes).toEqual(['một', 'hai']);
    expect(docs[0].source).toBe('zalo');
  });

  it('500 giữ stack, 401 thì không', async () => {
    const { docs, logs } = memory();
    const failed = openRequest(false);
    failed.failure = { status: 500, message: 'boom', stack: 'Error: boom\n    at fn (a.ts:1:1)' };
    await logs.recordFinished(finished(failed, { status: 500 }));
    expect(docs[0]).toMatchObject({ level: 'error', status: 500, message: 'boom' });
    expect(String(docs[0].stack)).toContain('boom');
    expect(docs[0].fingerprint).toBe('500 /api/orders boom');

    const denied = openRequest(false);
    denied.failure = { status: 401, message: 'Đăng nhập Zalo chưa xong', stack: 'Error: không lưu stack 4xx\n    at fn (a.ts:1:1)' };
    await logs.recordFinished(finished(denied, { status: 401, method: 'POST', path: '/api/auth/zalo/exchange?code=secret' }));
    expect(docs[1].stack).toBeUndefined();
    expect(String(docs[1].path)).not.toContain('secret');
    expect(docs[1].message).toBe('Đăng nhập Zalo chưa xong');
    expect(docs[1].level).toBe('warn');
  });

  it('bỏ beacon thành công và vẫn ghi beacon lỗi', async () => {
    const { docs, logs } = memory();
    await logs.recordFinished(finished(openRequest(false), { status: 204, method: 'POST', path: '/api/me/visit', ms: 1 }));
    await logs.recordFinished(finished(openRequest(false), { status: 204, method: 'POST', path: '/api/me/events', ms: 1 }));
    expect(docs).toHaveLength(0);
    const failed = openRequest(false);
    failed.failure = { status: 500, message: 'down', stack: 'Error: down\n    at fn (a.ts:1:1)' };
    await logs.recordFinished(finished(failed, { status: 500, method: 'POST', path: '/api/me/visit', ms: 4 }));
    expect(docs).toHaveLength(1);
    expect(docs[0].message).toBe('down');
  });

  it('hai lỗi cùng fingerprint ra một nhóm', async () => {
    const { logs } = memory();
    const once = (path: string) => {
      const state = openRequest(false);
      state.failure = { status: 400, message: 'Thiếu món' };
      return logs.recordFinished(finished(state, { status: 400, method: 'POST', path, ms: 3 }));
    };
    await once('/api/orders/MT482931');
    await once('/api/orders/MT100000');
    const other = openRequest(false);
    other.failure = { status: 400, message: 'Khác' };
    await logs.recordFinished(finished(other, { status: 400, method: 'POST', path: '/api/orders', ms: 3 }));
    const report = await logs.report();
    const group = report.items.find((item) => item.message === 'Thiếu món');
    expect(group?.count).toBe(2);
    expect(group?.fingerprint).toBe('400 /api/orders/:id Thiếu món');
    expect(report.items).toHaveLength(2);
  });

  it('bỏ qua ExceptionsHandler, health và đường đọc nhật ký', async () => {
    const { docs, logs } = memory();
    const logger = new PersistLogger(logs);
    logger.error('boom', 'Error: boom\n    at fn (a.ts:1:1)', 'ExceptionsHandler');
    const skipped = openRequest(true);
    await logs.recordFinished(finished(skipped, { status: 500, path: '/api/health' }));
    await logs.recordFinished(finished(openRequest(false), { status: 500, path: '/api/admin/logs' }));
    await Promise.resolve();
    expect(docs).toHaveLength(0);
  });

  it('warn ngoài request ghi ngay', async () => {
    const { docs, logs } = memory();
    new PersistLogger(logs).warn('Chưa có tài khoản admin', 'AuthService');
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ level: 'warn', source: 'app', message: 'Chưa có tài khoản admin' });
  });

  it('không lưu chữ ký trong meta', async () => {
    const { docs, logs } = memory();
    await logs.record({
      level: 'info',
      source: 'webhook',
      message: 'Webhook Zalo: user.revoke.consent',
      meta: { event: 'user.revoke.consent', signature: 'abc', token: 't' },
    });
    expect(docs[0].meta).toEqual({ event: 'user.revoke.consent' });
  });

  it('che token trên query và giữ email đăng nhập thất bại', async () => {
    const { docs, logs } = memory();
    const state = openRequest(false);
    state.meta = { email: 'a@b.c', signature: 'abc' };
    state.failure = { status: 401, message: 'Email hoặc mật khẩu chưa đúng' };
    await logs.recordFinished(finished(state, { status: 401, method: 'POST', path: '/api/auth/login?token=secret' }));
    expect(String(docs[0].path)).not.toContain('secret');
    expect(docs[0].meta).toEqual({ email: 'a@b.c' });
  });
});
