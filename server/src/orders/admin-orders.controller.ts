import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Sse, UseGuards, type MessageEvent } from '@nestjs/common';
import { interval, map, merge, type Observable } from 'rxjs';
import { AdminGuard } from '../auth/admin.guard.js';
import { AddItemDto, AdminListQuery, CancelOrderDto, SendInvoiceDto, UpdateItemDto, UpdateOrderDto } from './order.dto.js';
import { EventsService } from './events.service.js';
import { OrdersService } from './orders.service.js';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly events: EventsService,
  ) {}

  /** Sự kiện đơn mới/đổi, trang quản lý tải lại danh sách. Ping 25s để giữ kết nối. */
  @Sse('events')
  stream(): Observable<MessageEvent> {
    return merge(
      this.events.stream.pipe(map((e) => ({ data: e }))),
      interval(25_000).pipe(map(() => ({ type: 'ping', data: '' }))),
    );
  }

  @Get('badges')
  badges() {
    return this.orders.badges();
  }

  @Get('orders')
  list(@Query() q: AdminListQuery) {
    return this.orders.adminList(q);
  }

  @Get('orders/months')
  months() {
    return this.orders.months();
  }

  @Get('orders/:code')
  get(@Param('code') code: string) {
    return this.orders.adminGet(code);
  }

  @Patch('orders/:code')
  update(@Param('code') code: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(code, dto);
  }

  @Post('orders/:code/confirm')
  confirm(@Param('code') code: string) {
    return this.orders.setStatus(code, true);
  }

  @Post('orders/:code/unconfirm')
  unconfirm(@Param('code') code: string) {
    return this.orders.setStatus(code, false);
  }

  @Post('orders/:code/cancel')
  cancel(@Param('code') code: string, @Body() dto: CancelOrderDto) {
    return this.orders.cancel(code, dto.reason);
  }

  @Post('orders/:code/restore')
  restore(@Param('code') code: string) {
    return this.orders.restore(code);
  }

  @Post('orders/:code/items')
  addItem(@Param('code') code: string, @Body() dto: AddItemDto) {
    return this.orders.addItem(code, dto);
  }

  @Patch('orders/:code/items/:idx')
  updateItem(@Param('code') code: string, @Param('idx', ParseIntPipe) idx: number, @Body() dto: UpdateItemDto) {
    return this.orders.updateItem(code, idx, dto);
  }

  @Delete('orders/:code/items/:idx')
  removeItem(@Param('code') code: string, @Param('idx', ParseIntPipe) idx: number) {
    return this.orders.removeItem(code, idx);
  }

  @Post('orders/:code/send')
  send(@Param('code') code: string, @Body() dto: SendInvoiceDto) {
    return this.orders.send(code, dto);
  }
}
