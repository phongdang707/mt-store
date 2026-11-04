import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { LogListQuery } from './log.dto.js';
import { LogsService } from './logs.service.js';

@Controller('admin/logs')
@UseGuards(AdminGuard)
export class AdminLogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list(@Query() q: LogListQuery) {
    return this.logs.list(q);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.logs.one(id);
  }
}
