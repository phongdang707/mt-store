import { createHmac } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ZaloUser {
  id: string;
}

interface ZaloMe {
  id?: string;
  name?: string;
  error?: number;
  message?: string;
  picture?: { data?: { url?: string } };
}

/**
 * Xác minh access token của Zalo Mini App (`getAccessToken()` phía client) qua Graph API.
 * Token mặc định chỉ xuất được user ID — chuỗi này luôn có, không cần khách cấp quyền.
 * Tên và ảnh lấy ở `profile()` sau khi khách cấp `scope.userInfo`, chữ ký bằng `ZALO_APP_SECRET`.
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
    const res = await fetch('https://graph.zalo.me/v2.0/me?fields=id', {
      headers: { access_token: token, appsecret_proof: proof },
    });
    const me = (await res.json()) as ZaloMe;
    if (!me.id) {
      this.log.warn(`Zalo từ chối token: ${me.error} ${me.message}`);
      throw new UnauthorizedException('Phiên Zalo không hợp lệ');
    }
    const user = { id: me.id };
    this.cache.set(token, { user, exp: Date.now() + 10 * 60_000 });
    if (this.cache.size > 5000) this.cache.clear();
    return user;
  }

  /**
   * Tên và ảnh sau khi khách đã cấp `scope.userInfo`.
   * Gọi từ server vì Graph trên máy khách thiếu `appsecret_proof` đúng (lỗi 453).
   */
  async profile(token: string): Promise<{ name: string; avatar: string }> {
    const empty = { name: '', avatar: '' };
    const secret = this.config.get<string>('ZALO_APP_SECRET');
    if (!secret) {
      this.log.warn('Thiếu ZALO_APP_SECRET, không lấy được tên Zalo. Không dùng ZALO_API_KEY thay khóa này.');
      return empty;
    }
    const proof = createHmac('sha256', secret).update(token).digest('hex');
    const res = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
      headers: { access_token: token, appsecret_proof: proof },
    });
    const me = (await res.json()) as ZaloMe;
    if (me.error === 453) {
      this.log.warn('Zalo 453: ZALO_APP_SECRET không khớp Mini App đã cấp token. Không dùng ZALO_API_KEY cho chữ ký này.');
      return empty;
    }
    if (me.error || !me.name) {
      if (me.error) this.log.warn(`Zalo không trả tên: ${me.error} ${me.message}`);
      return empty;
    }
    return { name: me.name.trim(), avatar: me.picture?.data?.url?.trim() || '' };
  }
}
