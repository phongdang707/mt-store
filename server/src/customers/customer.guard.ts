import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { CustomerDocument } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { ZaloService, type ZaloUser } from './zalo.service.js';

export type CustomerRequest = Request & { customer: CustomerDocument };

/** Khách gửi `x-zalo-token` (access token Zalo). Dev không có App Secret: `x-dev-user`. */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(
    private readonly zalo: ZaloService,
    private readonly customers: CustomersService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<CustomerRequest>();
    const token = req.header('x-zalo-token');
    const dev = req.header('x-dev-user');
    let user: ZaloUser;
    if (token) user = await this.zalo.verify(token);
    else if (dev && this.zalo.devMode && /^[\w-]{6,64}$/.test(dev)) user = { id: 'dev:' + dev, name: '', avatar: '' };
    else throw new UnauthorizedException('Cần đăng nhập Zalo');
    req.customer = await this.customers.upsert(user);
    return true;
  }
}
