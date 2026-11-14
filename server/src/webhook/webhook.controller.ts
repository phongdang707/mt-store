import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { deletionStatus, FacebookWebhookService } from './webhook.service.js';

function hubValue(query: Request['query'], key: 'mode' | 'verify_token' | 'challenge') {
  const flat = query[`hub.${key}`];
  if (typeof flat === 'string') return flat;
  const nested = query.hub;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const value = (nested as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

@Controller('facebook')
export class FacebookWebhookController {
  constructor(private readonly webhooks: FacebookWebhookService) {}

  @Get('webhook')
  verify(@Req() req: Request, @Res() res: Response) {
    const challenge = this.webhooks.verify(hubValue(req.query, 'mode'), hubValue(req.query, 'verify_token'), hubValue(req.query, 'challenge'));
    res.status(200).type('text/plain').send(challenge);
  }

  @Post('webhook')
  @HttpCode(200)
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | string[] | undefined,
    @Body() body: unknown,
  ) {
    const header = Array.isArray(signature) ? signature[0] : signature;
    const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(JSON.stringify(body ?? {}));
    return this.webhooks.receive(raw, header, body);
  }

  @Post('deletion')
  @HttpCode(200)
  async deletion(@Req() req: Request, @Body() body: { signed_request?: unknown }) {
    const signed = typeof body?.signed_request === 'string' ? body.signed_request : '';
    const result = await this.webhooks.deletion(signed);
    const host = req.get('host') || '';
    const url = `${req.protocol}://${host}/api/facebook/deletion/${result.confirmation_code}`;
    return { url, confirmation_code: result.confirmation_code };
  }

  @Get('deletion/:code')
  status(@Param('code') code: string) {
    return deletionStatus(code);
  }
}
