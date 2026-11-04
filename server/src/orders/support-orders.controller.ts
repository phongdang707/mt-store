import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomerGuard } from '../customers/customer.guard.js';
import { SupportGuard } from '../customers/support.guard.js';
import { OrdersService } from './orders.service.js';

@Controller('support/orders')
@UseGuards(CustomerGuard, SupportGuard)
export class SupportOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.supportOrders();
  }
}
