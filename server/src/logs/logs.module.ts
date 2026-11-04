import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { LogExceptionFilter } from './log-exception.filter.js';
import { AppLog, AppLogSchema } from './log.schema.js';
import { AdminLogsController } from './logs.controller.js';
import { LogsService } from './logs.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: AppLog.name, schema: AppLogSchema }])],
  controllers: [AdminLogsController],
  providers: [LogsService, { provide: APP_FILTER, useClass: LogExceptionFilter }],
  exports: [LogsService],
})
export class LogsModule {}
