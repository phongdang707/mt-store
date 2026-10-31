import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { CustomerGuard, type CustomerRequest } from './customer.guard.js';

@Controller('me')
@UseGuards(CustomerGuard)
export class CustomersController {
  /** Thông tin khách để điền sẵn SĐT/địa chỉ. */
  @Get()
  me(@Req() req: CustomerRequest) {
    const c = req.customer;
    return { name: c.name, avatar: c.avatar, phone: c.phone, addr: c.addr };
  }
}
