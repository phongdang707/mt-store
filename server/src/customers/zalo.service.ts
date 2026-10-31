import { createHmac } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ZaloUser {
  id: string;
  name: string;
  avatar: string;
}

interface ZaloMe {
  id?: string;
  name?: string;
  picture?: { data?: { url?: string } };
  error?: number;
  message?: string;
}

/**
 * Xác minh access token của Zalo Mini App (`getAccessToken()` phía client) qua Graph API.
 * https://miniapp.zaloplatforms.com/documents/user-info/
 */
@Injectable()
export class ZaloService {
  private readonly log = new Logger(ZaloService.name);
  private readonly cache = new Map<string, { user: ZaloUser; exp: number }>();

  constructor(private readonly config: ConfigService) {}

  /** Chưa có App Secret và không chạy production: cho phép header `x-dev-user` để dev trên trình duyệt. */
  get devMode() {
    return !this.config.get('ZALO_APP_SECRET') && this.config.get('NODE_ENV') !== 'production';
  }

  async verify(token: string): Promise<ZaloUser> {
    const hit = this.cache.get(token);
    if (hit && hit.exp > Date.now()) return hit.user;
    const secret = this.config.get<string>('ZALO_APP_SECRET');
    if (!secret) throw new UnauthorizedException('Server chưa cấu hình ZALO_APP_SECRET');
    const proof = createHmac('sha256', secret).update(token).digest('hex');
    const res = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
      headers: { access_token: token, appsecret_proof: proof },
    });
    const me = (await res.json()) as ZaloMe;
    if (!me.id) {
      this.log.warn(`Zalo từ chối token: ${me.error} ${me.message}`);
      throw new UnauthorizedException('Phiên Zalo không hợp lệ');
    }
    const user = { id: me.id, name: me.name ?? '', avatar: me.picture?.data?.url ?? '' };
    this.cache.set(token, { user, exp: Date.now() + 10 * 60_000 });
    if (this.cache.size > 5000) this.cache.clear();
    return user;
  }
}
