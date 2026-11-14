import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { FacebookAuthService } from './facebook-auth.service.js';
import type { FacebookService } from './facebook.service.js';
import type { CustomersService } from './customers.service.js';
import type { CustomerSessionService } from './customer-session.service.js';

function auth(opts: { state?: { state: string } | null; blocked?: boolean } = {}) {
  const facebook = {
    appId: () => '99',
    appSecret: () => 'sekret',
    redirectUri: () => 'http://localhost:3001/facebook/callback',
    exchangeCode: vi.fn(async () => ({ access: 'short', exp: new Date(Date.now() + 3600_000) })),
    extend: vi.fn(async () => ({ access: 'long', exp: new Date(Date.now() + 86_400_000) })),
    identity: vi.fn(async () => ({ id: 'fb-1', name: 'An', avatar: 'https://cdn.example/a.jpg', email: 'a@b.c' })),
  };
  const customer = { _id: '507f1f77bcf86cd799439011', blocked: !!opts.blocked };
  const customers = {
    upsert: vi.fn(async () => customer),
    saveFacebookToken: vi.fn(async () => undefined),
    syncProfile: vi.fn(async () => ({ hasData: true, name: 'An', avatar: '' })),
  };
  const sessions = { sign: vi.fn(async () => 'jwt-customer') };
  const states = {
    create: vi.fn(async () => undefined),
    findOneAndDelete: vi.fn(() => ({ exec: async () => (opts.state === undefined ? { state: 'state-ok' } : opts.state) })),
  };
  const svc = new FacebookAuthService(
    facebook as unknown as FacebookService,
    customers as unknown as CustomersService,
    sessions as unknown as CustomerSessionService,
    states as never,
  );
  return { svc, facebook, customers, sessions, states };
}

describe('FacebookAuthService', () => {
  it('tạo URL dialog kèm state', async () => {
    const { svc, states } = auth();
    const { url } = await svc.start();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://www.facebook.com/v21.0/dialog/oauth');
    expect(parsed.searchParams.get('client_id')).toBe('99');
    expect(parsed.searchParams.get('scope')).toBe('public_profile');
    expect(parsed.searchParams.get('state')).toHaveLength(32);
    expect(states.create).toHaveBeenCalledOnce();
  });

  it('đổi code lấy JWT và không trả access token', async () => {
    const { svc, facebook, customers, sessions } = auth();
    await expect(svc.exchange('code-1', 'state-ok')).resolves.toEqual({ token: 'jwt-customer' });
    expect(facebook.exchangeCode).toHaveBeenCalledWith('code-1');
    expect(facebook.extend).toHaveBeenCalledWith('short');
    expect(customers.upsert).toHaveBeenCalledWith({ id: 'fb-1' });
    expect(customers.saveFacebookToken).toHaveBeenCalled();
    expect(customers.syncProfile).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      facebookName: 'An',
      avatar: 'https://cdn.example/a.jpg',
      email: 'a@b.c',
    });
    expect(sessions.sign).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('từ chối state hết hạn', async () => {
    const { svc } = auth({ state: null });
    await expect(svc.exchange('code-1', 'gone')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('từ chối khách bị chặn', async () => {
    const { svc, sessions } = auth({ blocked: true });
    await expect(svc.exchange('code-1', 'state-ok')).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.sign).not.toHaveBeenCalled();
  });
});
