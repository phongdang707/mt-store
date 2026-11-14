import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { FacebookWebhookController } from './webhook.controller.js';
import { FacebookWebhookService } from './webhook.service.js';

@Module({
  imports: [AnalyticsModule],
  controllers: [FacebookWebhookController],
  providers: [FacebookWebhookService],
})
export class FacebookWebhookModule {}
