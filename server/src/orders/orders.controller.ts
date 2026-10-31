import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomerGuard, type CustomerRequest } from '../customers/customer.guard.js';
import { StorageService } from '../storage/storage.service.js';
import { CreateOrderDto, CreateRequestDto } from './order.dto.js';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly storage: StorageService,
  ) {}

  @Post('orders')
  @UseGuards(CustomerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Req() req: CustomerRequest, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(req.customer, dto);
  }

  @Post('requests')
  @UseGuards(CustomerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  request(@Req() req: CustomerRequest, @Body() dto: CreateRequestDto) {
    return this.orders.createRequest(req.customer, dto, (u) => this.storage.isOwnUrl(u));
  }

  @Get('orders/mine')
  @UseGuards(CustomerGuard)
  mine(@Req() req: CustomerRequest) {
    return this.orders.mine(req.customer);
  }

  @Post('orders/:code/paid')
  @UseGuards(CustomerGuard)
  @HttpCode(200)
  paid(@Req() req: CustomerRequest, @Param('code') code: string) {
    return this.orders.markPaid(req.customer, code);
  }

  @Get('invoices/:token')
  invoice(@Param('token') token: string) {
    return this.orders.publicInvoice(token);
  }
}
