import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { LogsModule } from '../logs/logs.module.js';
import { ZaloWebhookController } from './webhook.controller.js';
import { ZaloWebhookService } from './webhook.service.js';

@Module({
  imports: [AnalyticsModule, LogsModule],
  controllers: [ZaloWebhookController],
  providers: [ZaloWebhookService],
})
export class ZaloWebhookModule {}
