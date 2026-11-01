import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AnalyticsService } from '../analytics/analytics.service.js';
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

function service(env: Record<string, string | undefined>, analytics: Partial<AnalyticsService>, storage: Partial<StorageService>) {
  const config = { get: (key: string) => env[key] } as ConfigService;
  return new ZaloWebhookService(config, analytics as AnalyticsService, storage as StorageService);
}

describe('ZaloWebhookService', () => {
  it('từ chối khi thiếu API key', async () => {
    const svc = service({}, {}, {});
    await expect(svc.receive(revoke, 'abc')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('từ chối chữ ký sai', async () => {
    const svc = service({ ZALO_API_KEY: 'test-key' }, {}, {});
    await expect(svc.receive(revoke, 'a'.repeat(64))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('từ chối appId khác Mini App đã cấu hình', async () => {
    const svc = service({ ZALO_API_KEY: 'test-key', ZALO_APP_ID: 'other' }, {}, {});
    const signature = zaloEventSignature(revoke, 'test-key');
    await expect(svc.receive(revoke, signature)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('xoá dữ liệu khi khách rút đồng ý', async () => {
    const analytics = { revokeZaloUser: vi.fn(async () => ({ found: true, photos: ['http://localhost:3000/uploads/requests/a.jpg'] })) };
    const storage = { remove: vi.fn(async () => undefined) };
    const svc = service({ ZALO_API_KEY: 'test-key', ZALO_APP_ID: revoke.appId }, analytics, storage);
    const res = await svc.receive(revoke, zaloEventSignature(revoke, 'test-key'));
    expect(res).toEqual({ message: 'ok' });
    expect(analytics.revokeZaloUser).toHaveBeenCalledWith(revoke.userId);
    expect(storage.remove).toHaveBeenCalledWith('http://localhost:3000/uploads/requests/a.jpg');
  });

  it('ghi nhận xét duyệt mà không xoá khách', async () => {
    const analytics = { revokeZaloUser: vi.fn() };
    const svc = service({ ZALO_API_KEY: 'Your API Key' }, analytics, {});
    const res = await svc.receive(review, zaloEventSignature(review, 'Your API Key'));
    expect(res).toEqual({ message: 'ok' });
    expect(analytics.revokeZaloUser).not.toHaveBeenCalled();
  });

  it('từ chối body không phải object', async () => {
    const svc = service({ ZALO_API_KEY: 'test-key' }, {}, {});
    await expect(svc.receive([], 'abc')).rejects.toBeInstanceOf(BadRequestException);
  });
});
