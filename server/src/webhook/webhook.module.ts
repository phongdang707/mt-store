import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { ZaloWebhookController } from './webhook.controller.js';
import { ZaloWebhookService } from './webhook.service.js';

@Module({
  imports: [AnalyticsModule],
  controllers: [ZaloWebhookController],
  providers: [ZaloWebhookService],
})
export class ZaloWebhookModule {}
