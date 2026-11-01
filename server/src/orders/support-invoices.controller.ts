import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CustomerGuard } from '../customers/customer.guard.js';
import { SupportGuard } from '../customers/support.guard.js';
import { OrdersService } from './orders.service.js';

@Controller('support/invoices')
@UseGuards(CustomerGuard, SupportGuard)
export class SupportInvoicesController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.supportList();
  }

  @Post(':code/send')
  send(@Param('code') code: string) {
    return this.orders.supportSend(code);
  }
}
