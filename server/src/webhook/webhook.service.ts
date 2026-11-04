import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { LogsService } from '../logs/logs.service.js';
import { StorageService } from '../storage/storage.service.js';
import { signaturesMatch, zaloEventSignature } from './signature.js';

@Injectable()
export class ZaloWebhookService {
  private readonly log = new Logger(ZaloWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
    private readonly storage: StorageService,
    private readonly logs: LogsService,
  ) {}

  async receive(body: unknown, signature: string | undefined) {
    const data = plainObject(body);
    const key = this.config.get<string>('ZALO_API_KEY')?.trim();
    if (!key) {
      this.log.error('Thiếu ZALO_API_KEY, từ chối webhook');
      throw new ServiceUnavailableException('Server chưa cấu hình ZALO_API_KEY');
    }
    if (!signature || !signaturesMatch(zaloEventSignature(data, key), signature)) {
      throw new UnauthorizedException('Chữ ký webhook không hợp lệ');
    }
    const appId = this.config.get<string>('ZALO_APP_ID')?.trim();
    if (appId && String(data.appId ?? '') !== appId) {
      this.log.warn(`Webhook appId ${String(data.appId ?? '')} không khớp ZALO_APP_ID`);
      throw new UnauthorizedException('Chữ ký webhook không hợp lệ');
    }
    if (typeof data.timestamp === 'number' && data.timestamp < 0) {
      throw new BadRequestException('Sự kiện webhook không hợp lệ');
    }
    await this.dispatch(data);
    return { message: 'ok' };
  }

  private async dispatch(data: Record<string, unknown>) {
    const event = data.event;
    if (event === 'user.revoke.consent') {
      const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
      if (!userId || userId.length > 64) throw new BadRequestException('Sự kiện webhook không hợp lệ');
      const { found, photos } = await this.analytics.revokeZaloUser(userId);
      await Promise.all(photos.map((url) => this.storage.remove(url)));
      this.log.log(found ? `Đã xoá dữ liệu khách rút đồng ý ${userId}` : `Khách rút đồng ý ${userId} nhưng không có hồ sơ`);
      await this.noted('user.revoke.consent');
      return;
    }
    if (event === 'versions.review.done') {
      const description = typeof data.description === 'string' ? data.description.slice(0, 500) : '';
      const verdict = data.status === 0 ? 'được duyệt' : data.status === -1 ? 'bị từ chối' : `trạng thái ${String(data.status)}`;
      this.log.log(`Zalo xét duyệt phiên bản ${String(data.versionId)}: ${verdict}${description ? ` — ${description}` : ''}`);
      await this.noted('versions.review.done');
      return;
    }
    if (typeof event === 'string' && event) {
      this.log.log(`Webhook Zalo bỏ qua sự kiện ${event}`);
      await this.noted(event, true);
      return;
    }
    throw new BadRequestException('Sự kiện webhook không hợp lệ');
  }

  /** Chỉ tên sự kiện. Không lưu chữ ký hay payload. */
  private noted(event: string, ignored = false) {
    const name = event.slice(0, 80);
    return this.logs.record({
      level: 'info',
      source: 'webhook',
      method: 'POST',
      path: '/api/zalo/webhook',
      message: ignored ? `Webhook Zalo bỏ qua sự kiện ${name}` : `Webhook Zalo: ${name}`,
      meta: { event: name },
    });
  }
}

function plainObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Sự kiện webhook không hợp lệ');
  }
  return body as Record<string, unknown>;
}
