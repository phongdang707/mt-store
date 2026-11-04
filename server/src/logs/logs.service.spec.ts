import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { AppLog } from './log.schema.js';
import { LogsService } from './logs.service.js';
import { PersistLogger } from './persist-logger.js';
import { requestLog } from './request-log.js';

type Doc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

function memory() {
  const docs: Doc[] = [];
  const model = {
    async create(data: Record<string, unknown>) {
      const doc: Doc = { ...data, _id: new mongoose.Types.ObjectId() };
      docs.push(doc);
      return doc;
    },
    findById(id: unknown) {
      const found = docs.find((d) => String(d._id) === String(id));
      const copy = found ? { ...found, meta: found.meta } : null;
      return { lean: () => ({ exec: async () => copy }) };
    },
    updateOne(filter: { _id: unknown }, update: { $set: Record<string, unknown> }) {
      return {
        exec: async () => {
          const doc = docs.find((d) => String(d._id) === String(filter._id));
          if (doc) Object.assign(doc, update.$set);
        },
      };
    },
  };
  return { docs, logs: new LogsService(model as unknown as Model<AppLog>) };
}

describe('LogsService', () => {
  it('gắn status vào warn đã ghi trong cùng request', async () => {
    const { docs, logs } = memory();
    const logger = new PersistLogger(logs);
    await requestLog.run({ skip: false }, async () => {
      logger.warn('Zalo từ chối token: 453', 'ZaloService');
      await logs.recordHttp({
        status: 401,
        method: 'POST',
        path: '/api/auth/zalo/exchange?code=secret',
        message: 'Đăng nhập Zalo chưa xong. Bạn thử lại nhé.',
        stack: 'Error: không lưu stack 4xx\n    at fn (a.ts:1:1)',
      });
    });
    expect(docs).toHaveLength(1);
    expect(docs[0].message).toBe('Zalo từ chối token: 453');
    expect(docs[0].status).toBe(401);
    expect(docs[0].source).toBe('zalo');
    expect(docs[0].method).toBe('POST');
    expect(String(docs[0].path)).not.toContain('secret');
    expect(docs[0].stack).toBeUndefined();
  });

  it('tạo một dòng error cho 500', async () => {
    const { docs, logs } = memory();
    await requestLog.run({ skip: false }, async () => {
      await logs.recordHttp({
        status: 500,
        method: 'GET',
        path: '/api/orders',
        message: 'boom',
        stack: 'Error: boom\n    at fn (a.ts:1:1)',
      });
    });
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ level: 'error', source: 'http', status: 500, method: 'GET', path: '/api/orders', message: 'boom' });
    expect(String(docs[0].stack)).toContain('boom');
  });

  it('hai warn trong một request chỉ một dòng', async () => {
    const { docs, logs } = memory();
    const logger = new PersistLogger(logs);
    await requestLog.run({ skip: false }, async () => {
      logger.warn('một', 'ZaloService');
      logger.warn('hai', 'ZaloService');
      const ctx = requestLog.getStore();
      if (ctx?.pending) await ctx.pending;
    });
    expect(docs).toHaveLength(1);
    expect(docs[0].message).toBe('một');
  });

  it('bỏ qua ExceptionsHandler, health và đường đọc nhật ký', async () => {
    const { docs, logs } = memory();
    const logger = new PersistLogger(logs);
    logger.error('boom', 'Error: boom\n    at fn (a.ts:1:1)', 'ExceptionsHandler');
    await requestLog.run({ skip: true }, async () => {
      await logs.recordHttp({ status: 500, method: 'GET', path: '/api/health', message: 'down' });
      await logs.recordHttp({ status: 500, method: 'GET', path: '/api/admin/logs', message: 'down' });
    });
    await Promise.resolve();
    expect(docs).toHaveLength(0);
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
});
