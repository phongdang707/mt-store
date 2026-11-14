import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { CustomerGuard } from './customer.guard.js';
import type { CustomerSessionService } from './customer-session.service.js';
import type { CustomersService } from './customers.service.js';
import type { FacebookService } from './facebook.service.js';

function ctx(headers: Record<string, string | undefined>) {
  const req: { header: (name: string) => string | undefined; customer?: { _id: string; blocked?: boolean } } = {
    header: (name) => headers[name.toLowerCase()],
  };
  return { req, context: { switchToHttp: () => ({ getRequest: () => req }) } as ExecutionContext };
}

function guard(opts: { devMode?: boolean; customer?: { _id: string; blocked?: boolean } | null } = {}) {
  const facebook = { devMode: !!opts.devMode };
  const customers = {
    byId: vi.fn(async () => (opts.customer === undefined ? { _id: '507f1f77bcf86cd799439011', blocked: false } : opts.customer)),
    upsert: vi.fn(async (u: { id: string }) => ({ _id: 'dev-row', blocked: false, facebookUserId: u.id })),
  };
  const sessions = { verify: vi.fn(async (token: string) => (token === 'good' ? '507f1f77bcf86cd799439011' : Promise.reject(new UnauthorizedException('Phiên đăng nhập đã hết hạn')))) };
  const g = new CustomerGuard(facebook as unknown as FacebookService, customers as unknown as CustomersService, sessions as unknown as CustomerSessionService);
  return { g, customers };
}

describe('CustomerGuard', () => {
  it('nhận JWT khách', async () => {
    const { g } = guard();
    const { req, context } = ctx({ authorization: 'Bearer good' });
    await expect(g.canActivate(context)).resolves.toBe(true);
    expect(req.customer?._id).toBe('507f1f77bcf86cd799439011');
  });

  it('từ chối khi không có phiên, kể cả token Zalo', async () => {
    const { g } = guard();
    const { context } = ctx({ 'x-zalo-token': 'zalo-access' });
    await expect(g.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('dev user khi chưa có app secret', async () => {
    const { g, customers } = guard({ devMode: true });
    const { context } = ctx({ 'x-dev-user': 'browser1' });
    await expect(g.canActivate(context)).resolves.toBe(true);
    expect(customers.upsert).toHaveBeenCalledWith({ id: 'dev:browser1' });
  });

  it('không nhận dev user khi đã có app secret', async () => {
    const { g, customers } = guard({ devMode: false });
    const { context } = ctx({ 'x-dev-user': 'browser1' });
    await expect(g.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(customers.upsert).not.toHaveBeenCalled();
  });

  it('chặn khách bị khoá', async () => {
    const { g } = guard({ customer: { _id: '507f1f77bcf86cd799439011', blocked: true } });
    const { context } = ctx({ authorization: 'Bearer good' });
    await expect(g.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
