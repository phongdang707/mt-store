import { ConfigService } from '@nestjs/config';
import { pageInboxUrl, threadOf } from '../customers/messenger.js';
import type { CustomersService } from '../customers/customers.service.js';
import { MessengerService } from './messenger.service.js';

describe('pageInboxUrl', () => {
  it('mở hộp thư đúng Page và cuộc chat', () => {
    expect(pageInboxUrl('6159', 't_42')).toBe('https://business.facebook.com/latest/inbox/all?asset_id=6159&selected_item_id=t_42');
  });

  it('đọc id và link cuộc chat Graph trả về', () => {
    expect(threadOf({ data: [{ id: 't_42', link: 'https://www.facebook.com/messages/t/42' }] })).toEqual({
      id: 't_42',
      link: 'https://www.facebook.com/messages/t/42',
    });
    expect(threadOf({ data: [] })).toEqual({ id: '', link: '' });
  });
});

describe('MessengerService inbox', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
  });

  function service(target: { psid: string; ready: boolean } | null) {
    const env: Record<string, string> = { FACEBOOK_PAGE_ID: '6159', FACEBOOK_PAGE_ACCESS_TOKEN: 'page-token' };
    const customers = { messengerOf: async () => target };
    const orders = { findOne: () => ({ select: () => ({ exec: async () => ({ customer: '507f1f77bcf86cd799439011' }) }) }) };
    return new MessengerService(envService(env), customers as unknown as CustomersService, orders as never);
  }

  it('trả link cuộc chat khi khách đã nhắn Page', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ data: [{ id: 't_42' }] }), { status: 200 })) as typeof fetch;
    await expect(service({ psid: 'psid-1', ready: false }).inboxForOrder('MT000001')).resolves.toEqual({
      url: 'https://business.facebook.com/latest/inbox/all?asset_id=6159&selected_item_id=t_42',
    });
  });

  it('báo khi khách chưa nhắn Page', async () => {
    await expect(service(null).inboxForOrder('MT000001')).rejects.toThrow('Khách chưa nhắn Page');
  });
});

function envService(env: Record<string, string>) {
  return { get: (key: string) => env[key] } as ConfigService;
}
