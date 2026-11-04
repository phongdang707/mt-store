import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { setActor } from '../logs/request-log.js';
import { CustomerSessionService } from './customer-session.service.js';
import type { CustomerDocument } from './customer.schema.js';
import { CustomersService } from './customers.service.js';
import { ZaloService } from './zalo.service.js';

export type CustomerRequest = Request & { customer: CustomerDocument };

/** Mini App gửi `x-zalo-token`. Web gửi JWT `Authorization: Bearer`. Dev không có App Secret: `x-dev-user`. */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(
    private readonly zalo: ZaloService,
    private readonly customers: CustomersService,
    private readonly sessions: CustomerSessionService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<CustomerRequest>();
    const token = req.header('x-zalo-token');
    const dev = req.header('x-dev-user');
    const header = req.header('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (token) {
      const user = await this.zalo.verify(token);
      const customer = await this.customers.upsert(user);
      if (!customer) throw new UnauthorizedException('Cần đăng nhập Zalo');
      req.customer = customer;
    } else if (bearer) {
      const id = await this.sessions.verify(bearer);
      const customer = await this.customers.byId(id);
      if (!customer) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
      req.customer = customer;
    } else if (dev && this.zalo.devMode && /^[\w-]{6,64}$/.test(dev)) {
      const customer = await this.customers.upsert({ id: 'dev:' + dev });
      if (!customer) throw new UnauthorizedException('Cần đăng nhập Zalo');
      req.customer = customer;
    } else throw new UnauthorizedException('Cần đăng nhập Zalo');
    setActor(String(req.customer._id));
    if (req.customer.blocked) throw new ForbiddenException('Hệ thống đang bảo trì. Bạn quay lại sau nhé.');
    return true;
  }
}
