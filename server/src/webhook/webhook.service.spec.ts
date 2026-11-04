import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AnalyticsService } from '../analytics/analytics.service.js';
import type { LogsService } from '../logs/logs.service.js';
import type { StorageService } from '../storage/storage.service.js';
import { zaloEventSignature } from './signature.js';
import { ZaloWebhookService } from './webhook.service.js';

const revoke = {
  event: 'user.revoke.consent',
  appId: '2646373759294038927',
  userId: '4047671499938107249',
  timestamp: 1670553442564,
};

const review = {
  event: 'versions.review.done',
  appId: '2646373759294038927',
  versionId: 101,
  status: 0,
  description: '',
  timestamp: 1670553442564,
};

function service(
  env: Record<string, string | undefined>,
  analytics: Partial<AnalyticsService>,
  storage: Partial<StorageService>,
  logs: Partial<LogsService> = { record: vi.fn(async () => null) },
) {
  const config = { get: (key: string) => env[key] } as ConfigService;
  return new ZaloWebhookService(config, analytics as AnalyticsService, storage as StorageService, logs as LogsService);
}

describe('ZaloWebhookService', () => {
  it('từ chối khi thiếu API key', async () => {
    const svc = service({}, {}, {});
    await expect(svc.receive(revoke, 'abc')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('từ chối chữ ký sai', async () => {
    const logs = { record: vi.fn(async () => null) };
    const svc = service({ ZALO_API_KEY: 'test-key' }, {}, {}, logs);
    await expect(svc.receive(revoke, 'a'.repeat(64))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(logs.record).not.toHaveBeenCalled();
  });

  it('từ chối appId khác Mini App đã cấu hình', async () => {
    const svc = service({ ZALO_API_KEY: 'test-key', ZALO_APP_ID: 'other' }, {}, {});
    const signature = zaloEventSignature(revoke, 'test-key');
    await expect(svc.receive(revoke, signature)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('xoá dữ liệu khi khách rút đồng ý', async () => {
    const analytics = { revokeZaloUser: vi.fn(async () => ({ found: true, photos: ['http://localhost:3000/uploads/requests/a.jpg'] })) };
    const storage = { remove: vi.fn(async () => undefined) };
    const notes: unknown[] = [];
    const logs = {
      record: vi.fn(async (row: unknown) => {
        notes.push(row);
        return '1';
      }),
    };
    const signature = zaloEventSignature(revoke, 'test-key');
    const svc = service({ ZALO_API_KEY: 'test-key', ZALO_APP_ID: revoke.appId }, analytics, storage, logs);
    const res = await svc.receive(revoke, signature);
    expect(res).toEqual({ message: 'ok' });
    expect(analytics.revokeZaloUser).toHaveBeenCalledWith(revoke.userId);
    expect(storage.remove).toHaveBeenCalledWith('http://localhost:3000/uploads/requests/a.jpg');
    expect(notes).toEqual([
      {
        level: 'info',
        source: 'webhook',
        method: 'POST',
        path: '/api/zalo/webhook',
        message: 'Webhook Zalo: user.revoke.consent',
        meta: { event: 'user.revoke.consent' },
      },
    ]);
    const dumped = JSON.stringify(notes);
    expect(dumped).not.toContain(signature);
    expect(dumped).not.toContain(revoke.userId);
  });

  it('ghi nhận xét duyệt mà không xoá khách', async () => {
    const analytics = { revokeZaloUser: vi.fn() };
    const notes: unknown[] = [];
    const logs = {
      record: vi.fn(async (row: unknown) => {
        notes.push(row);
        return '1';
      }),
    };
    const body = { ...review, description: 'ghi chú nội bộ không được lưu' };
    const signature = zaloEventSignature(body, 'Your API Key');
    const svc = service({ ZALO_API_KEY: 'Your API Key' }, analytics, {}, logs);
    const res = await svc.receive(body, signature);
    expect(res).toEqual({ message: 'ok' });
    expect(analytics.revokeZaloUser).not.toHaveBeenCalled();
    expect(JSON.stringify(notes)).not.toContain('ghi chú nội bộ');
    expect(JSON.stringify(notes)).not.toContain(signature);
    expect(notes[0]).toMatchObject({ level: 'info', source: 'webhook', meta: { event: 'versions.review.done' } });
  });

  it('từ chối body không phải object', async () => {
    const svc = service({ ZALO_API_KEY: 'test-key' }, {}, {});
    await expect(svc.receive([], 'abc')).rejects.toBeInstanceOf(BadRequestException);
  });
});
