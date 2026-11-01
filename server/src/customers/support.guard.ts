import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { CustomerRequest } from './customer.guard.js';

/** Chạy sau CustomerGuard. Khách thường không xem hoá đơn của người khác. */
@Injectable()
export class SupportGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<CustomerRequest>();
    if (req.customer?.role !== 'support') throw new ForbiddenException('Chỉ customer support dùng được mục này');
    return true;
  }
}
