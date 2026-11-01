import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ZaloWebhookService } from './webhook.service.js';

@Controller('zalo')
export class ZaloWebhookController {
  constructor(private readonly webhooks: ZaloWebhookService) {}

  /** Sự kiện Open API của Mini App. Zalo gửi POST kèm `X-ZEvent-Signature`. */
  @Post('webhook')
  @HttpCode(200)
  receive(@Headers('x-zevent-signature') signature: string | string[] | undefined, @Body() body: unknown) {
    const header = Array.isArray(signature) ? signature[0] : signature;
    return this.webhooks.receive(body, header);
  }
}
