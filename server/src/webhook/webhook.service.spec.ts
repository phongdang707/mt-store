import { createHmac } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AnalyticsService } from '../analytics/analytics.service.js';
import type { CustomersService } from '../customers/customers.service.js';
import { openRequest, requestLog } from '../logs/request-log.js';
import type { StorageService } from '../storage/storage.service.js';
import { FacebookWebhookService } from './webhook.service.js';

const REF = '507f1f77bcf86cd799439011';

function sign(raw: Buffer, secret: string) {
  return 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
}

function service(
  env: Record<string, string | undefined>,
  analytics: Partial<AnalyticsService>,
  customers: Partial<CustomersService>,
  storage: Partial<StorageService> = {},
) {
  const config = { get: (key: string) => env[key] } as ConfigService;
  return new FacebookWebhookService(config, analytics as AnalyticsService, customers as CustomersService, storage as StorageService);
}

describe('FacebookWebhookService', () => {
  it('trả challenge khi verify token đúng', () => {
    const svc = service({ FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'hook' }, {}, {});
    expect(svc.verify('subscribe', 'hook', '12345')).toBe('12345');
  });

  it('từ chối verify token sai', () => {
    const svc = service({ FACEBOOK_WEBHOOK_VERIFY_TOKEN: 'hook' }, {}, {});
    expect(() => svc.verify('subscribe', 'nope', '12345')).toThrow(UnauthorizedException);
  });

  it('từ chối khi thiếu app secret', async () => {
    const svc = service({}, {}, {});
    await expect(svc.receive(Buffer.from('{}'), 'sha256=aa', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('từ chối chữ ký sai', async () => {
    const svc = service({ FACEBOOK_APP_SECRET: 'sekret' }, {}, {});
    const raw = Buffer.from('{"object":"page"}');
    await expect(svc.receive(raw, sign(raw, 'other'), {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('gắn PSID theo ref và cập nhật khi khách nhắn', async () => {
    const customers = { bindMessenger: vi.fn(async () => true), touchMessenger: vi.fn(async () => undefined) };
    const body = {
      object: 'page',
      entry: [
        {
          messaging: [
            { sender: { id: 'psid-1' }, recipient: { id: 'page-1' }, referral: { ref: REF } },
            { sender: { id: 'psid-2' }, recipient: { id: 'page-1' }, message: { text: 'xin chào' } },
          ],
        },
      ],
    };
    const raw = Buffer.from(JSON.stringify(body));
    const svc = service({ FACEBOOK_APP_SECRET: 'sekret', FACEBOOK_PAGE_ID: 'page-1' }, {}, customers);
    const state = openRequest(false);
    const res = await requestLog.run(state, () => svc.receive(raw, sign(raw, 'sekret'), body));
    expect(res).toEqual({ message: 'ok' });
    expect(customers.bindMessenger).toHaveBeenCalledWith(REF, 'psid-1', false);
    expect(customers.touchMessenger).toHaveBeenCalledWith('psid-2');
    expect(state.message).toBe('Webhook Facebook: messages');
  });

  it('xoá dữ liệu khi signed_request hợp lệ', async () => {
    const analytics = { revokeFacebookUser: vi.fn(async () => ({ found: true, photos: ['https://cdn.example/a.jpg'] })) };
    const storage = { remove: vi.fn(async () => undefined) };
    const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: '998877' })).toString('base64url');
    const sig = createHmac('sha256', 'sekret').update(payload).digest('base64url');
    const svc = service({ FACEBOOK_APP_SECRET: 'sekret' }, analytics, {}, storage);
    const state = openRequest(false);
    const res = await requestLog.run(state, () => svc.deletion(`${sig}.${payload}`));
    expect(res.confirmation_code).toMatch(/^[a-f0-9]{16}$/);
    expect(analytics.revokeFacebookUser).toHaveBeenCalledWith('998877');
    expect(storage.remove).toHaveBeenCalledWith('https://cdn.example/a.jpg');
    expect(state.message).toBe('Webhook Facebook: data-deletion');
    expect(JSON.stringify({ message: state.message, meta: state.meta })).not.toContain('998877');
  });
});
