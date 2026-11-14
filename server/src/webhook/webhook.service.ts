import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { setRequestMessage } from '../logs/request-log.js';
import { StorageService } from '../storage/storage.service.js';
import { hubSignatureMatches, parseSignedRequest } from './signed-request.js';

const CUSTOMER_REF = /^[a-f0-9]{24}$/i;

interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { is_echo?: boolean; referral?: { ref?: string } };
  referral?: { ref?: string };
  postback?: { referral?: { ref?: string } };
}

@Injectable()
export class FacebookWebhookService {
  private readonly log = new Logger(FacebookWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
    private readonly customers: CustomersService,
    private readonly storage: StorageService,
  ) {}

  verify(mode: string, token: string, challenge: string) {
    const expected = this.config.get<string>('FACEBOOK_WEBHOOK_VERIFY_TOKEN')?.trim();
    if (!expected) throw new ServiceUnavailableException('Server chưa cấu hình webhook Facebook');
    if (mode !== 'subscribe' || !token || token !== expected || !challenge) {
      throw new UnauthorizedException('Xác minh webhook không hợp lệ');
    }
    return challenge;
  }

  async receive(raw: Buffer, signature: string | undefined, body: unknown) {
    const secret = this.config.get<string>('FACEBOOK_APP_SECRET')?.trim();
    if (!secret) {
      this.log.error('Thiếu FACEBOOK_APP_SECRET, từ chối webhook');
      throw new ServiceUnavailableException('Server chưa cấu hình FACEBOOK_APP_SECRET');
    }
    if (!hubSignatureMatches(raw, secret, signature)) throw new UnauthorizedException('Chữ ký webhook không hợp lệ');
    const events = messagingOf(body);
    const pageId = this.config.get<string>('FACEBOOK_PAGE_ID')?.trim();
    let bound = 0;
    for (const event of events) {
      if (pageId && event.recipient?.id && event.recipient.id !== pageId) continue;
      const psid = event.sender?.id?.trim() || '';
      if (!psid || event.message?.is_echo) continue;
      const ref = refOf(event);
      const messaged = !!event.message && !event.message.is_echo;
      if (ref && CUSTOMER_REF.test(ref)) {
        if (await this.customers.bindMessenger(ref, psid, messaged)) bound += 1;
      } else if (messaged) {
        await this.customers.touchMessenger(psid);
      }
    }
    this.noted(bound ? 'messages' : 'ignored', !bound);
    return { message: 'ok' };
  }

  /** Data Deletion Callback. Xoá hồ sơ theo facebook user id trong signed_request. */
  async deletion(signedRequest: string) {
    const secret = this.config.get<string>('FACEBOOK_APP_SECRET')?.trim();
    if (!secret) throw new ServiceUnavailableException('Server chưa cấu hình FACEBOOK_APP_SECRET');
    const data = parseSignedRequest(signedRequest, secret);
    const userId = data?.user_id?.trim() || '';
    if (!userId || userId.length > 64) throw new UnauthorizedException('Yêu cầu xoá dữ liệu không hợp lệ');
    const { found, photos } = await this.analytics.revokeFacebookUser(userId);
    await Promise.all(photos.map((url) => this.storage.remove(url)));
    const confirmation_code = randomBytes(8).toString('hex');
    this.log.log(found ? 'Đã xoá dữ liệu theo yêu cầu Facebook' : 'Yêu cầu xoá dữ liệu không khớp hồ sơ');
    this.noted('data-deletion');
    return { confirmation_code };
  }

  private noted(event: string, ignored = false) {
    const name = event.slice(0, 80);
    setRequestMessage(ignored ? `Webhook Facebook bỏ qua sự kiện ${name}` : `Webhook Facebook: ${name}`, { event: name });
  }
}

export function messagingOf(body: unknown): MessagingEvent[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  const root = body as { object?: string; entry?: { messaging?: MessagingEvent[] }[] };
  if (root.object !== 'page' || !Array.isArray(root.entry)) return [];
  return root.entry.flatMap((entry) => (Array.isArray(entry.messaging) ? entry.messaging : []));
}

function refOf(event: MessagingEvent) {
  const ref = event.referral?.ref || event.message?.referral?.ref || event.postback?.referral?.ref || '';
  return ref.trim();
}

export function deletionStatus(code: string) {
  if (!/^[a-f0-9]{16}$/.test(code)) throw new BadRequestException('Không thấy yêu cầu này');
  return { confirmation_code: code, status: 'done' };
}
