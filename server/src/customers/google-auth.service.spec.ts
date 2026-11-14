import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service.js';
import type { GoogleService } from './google.service.js';
import type { CustomersService } from './customers.service.js';
import type { CustomerSessionService } from './customer-session.service.js';

function auth(opts: { state?: { state: string } | null; blocked?: boolean } = {}) {
  const google = {
    clientId: () => 'client-id',
    clientSecret: () => 'sekret',
    redirectUri: () => 'http://localhost:3001/google/callback',
    exchangeCode: vi.fn(async () => ({ access: 'access-token' })),
    identity: vi.fn(async () => ({ id: 'g-1', name: 'An', avatar: 'https://cdn.example/a.jpg', email: 'a@b.c' })),
  };
  const customer = { _id: '507f1f77bcf86cd799439011', blocked: !!opts.blocked };
  const customers = {
    upsert: vi.fn(async () => customer),
    syncProfile: vi.fn(async () => ({ hasData: true, name: 'An', avatar: '' })),
  };
  const sessions = { sign: vi.fn(async () => 'jwt-customer') };
  const states = {
    create: vi.fn(async () => undefined),
    findOneAndDelete: vi.fn(() => ({ exec: async () => (opts.state === undefined ? { state: 'state-ok' } : opts.state) })),
  };
  const svc = new GoogleAuthService(
    google as unknown as GoogleService,
    customers as unknown as CustomersService,
    sessions as unknown as CustomerSessionService,
    states as never,
  );
  return { svc, google, customers, sessions };
}

describe('GoogleAuthService', () => {
  it('tạo URL ủy quyền kèm state', async () => {
    const { svc } = auth();
    const { url } = await svc.start();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3001/google/callback');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    expect(parsed.searchParams.get('state')).toHaveLength(32);
  });

  it('đổi code lấy JWT và không trả access token', async () => {
    const { svc, google, customers, sessions } = auth();
    await expect(svc.exchange('code-1', 'state-ok')).resolves.toEqual({ token: 'jwt-customer' });
    expect(google.exchangeCode).toHaveBeenCalledWith('code-1');
    expect(google.identity).toHaveBeenCalledWith('access-token');
    expect(customers.upsert).toHaveBeenCalledWith({ id: 'g-1' });
    expect(customers.syncProfile).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      googleName: 'An',
      avatar: 'https://cdn.example/a.jpg',
      email: 'a@b.c',
    });
    expect(sessions.sign).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(JSON.stringify(await svc.exchange('code-1', 'state-ok'))).not.toContain('access-token');
  });

  it('từ chối state hết hạn', async () => {
    const { svc, google } = auth({ state: null });
    await expect(svc.exchange('code-1', 'gone')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(google.exchangeCode).not.toHaveBeenCalled();
  });

  it('từ chối khách bị chặn', async () => {
    const { svc, sessions } = auth({ blocked: true });
    await expect(svc.exchange('code-1', 'state-ok')).rejects.toBeInstanceOf(ForbiddenException);
    expect(sessions.sign).not.toHaveBeenCalled();
  });
});
