import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { CustomerGuard, type CustomerRequest } from '../customers/customer.guard.js';
import { DaysQuery, EventsDto, VisitDto } from './analytics.dto.js';
import { AnalyticsService } from './analytics.service.js';

@Controller()
export class TrackController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Hồ sơ, máy, và số giây app vừa hiện. */
  @Post('me/visit')
  @HttpCode(204)
  @UseGuards(CustomerGuard)
  visit(@Req() req: CustomerRequest, @Body() dto: VisitDto) {
    return this.analytics.visit(req.customer, dto);
  }

  /** Sản phẩm khách vừa xem, mở, hoặc thêm giỏ. */
  @Post('me/events')
  @HttpCode(204)
  @UseGuards(CustomerGuard)
  events(@Req() req: CustomerRequest, @Body() dto: EventsDto) {
    return this.analytics.track(req.customer._id, dto);
  }
}

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  report(@Query() q: DaysQuery) {
    return this.analytics.report(q);
  }

  @Get('users/:id')
  user(@Param('id') id: string, @Query() q: DaysQuery) {
    return this.analytics.user(id, q);
  }
}
