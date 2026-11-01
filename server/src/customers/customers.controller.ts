import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { BlockCustomerDto } from './customer.dto.js';
import { CustomerGuard, type CustomerRequest } from './customer.guard.js';
import { CustomersService } from './customers.service.js';

@Controller('me')
@UseGuards(CustomerGuard)
export class CustomersController {
  /** Id khách để tách giỏ trên máy, cùng SĐT/địa chỉ của đúng người đó. */
  @Get()
  me(@Req() req: CustomerRequest) {
    const c = req.customer;
    return { id: String(c._id), name: c.zaloName || c.name, avatar: c.avatar, phone: c.phone, addr: c.addr };
  }
}

@Controller('admin/customers')
@UseGuards(AdminGuard)
export class AdminCustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Patch(':id')
  block(@Param('id') id: string, @Body() dto: BlockCustomerDto) {
    return this.customers.setBlocked(id, dto.blocked);
  }
}
