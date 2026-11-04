import { createHmac } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ZaloUser {
  id: string;
}

export interface ZaloTokens {
  access: string;
  refresh: string;
  exp: Date;
}

interface ZaloMe {
  id?: string;
  name?: string;
  error?: number;
  message?: string;
  picture?: { data?: { url?: string } };
}

interface ZaloTokenBody {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  error?: number | string;
  error_name?: string;
}

/**
 * Giữ `id` đúng từng chữ số. JSON.parse biến số dài hơn 2^53 thành số làm tròn.
 */
export function parseZaloMe(text: string): ZaloMe {
  let data: ZaloMe = {};
  try {
    data = JSON.parse(text) as ZaloMe;
  } catch {
    return {};
  }
  const quoted = text.match(/"id"\s*:\s*"([^"]+)"/);
  const bare = text.match(/"id"\s*:\s*(\d{1,32})/);
  const id = quoted?.[1] || bare?.[1] || (data.id ? String(data.id) : '');
  if (id) data.id = id;
  return data;
}

/**
 * Xác minh access token của Zalo Mini App (`getAccessToken()` phía client) qua Graph API.
 * Token mặc định chỉ xuất được user ID — chuỗi này luôn có, không cần khách cấp quyền.
 * Tên và ảnh lấy ở `profile()` sau khi khách cấp `scope.userInfo`, chữ ký bằng `ZALO_APP_SECRET`.
 * Web đổi oauth code ở `exchangeCode()` theo OAuth v4 (PKCE).
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
    const me = await this.graph(token, 'id');
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
   * Tên và ảnh sau khi khách đã cấp quyền.
   * Gọi từ server vì Graph trên máy khách thiếu `appsecret_proof` đúng (lỗi 453).
   */
  async profile(token: string): Promise<{ name: string; avatar: string }> {
    const empty = { name: '', avatar: '' };
    if (!this.config.get<string>('ZALO_APP_SECRET')) {
      this.log.warn('Thiếu ZALO_APP_SECRET, không lấy được tên Zalo. Không dùng ZALO_API_KEY thay khóa này.');
      return empty;
    }
    const me = await this.graph(token, 'id,name,picture');
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

  /** Id, tên và ảnh sau khi đổi oauth code. Id là chuỗi, cùng khóa với Mini App nếu cùng App ID. */
  async identity(token: string) {
    const me = await this.graph(token, 'id,name,picture');
    if (!me.id) {
      this.log.warn(`Zalo từ chối token: ${me.error} ${me.message}`);
      return { id: '', name: '', avatar: '' };
    }
    return { id: me.id, name: me.name?.trim() || '', avatar: me.picture?.data?.url?.trim() || '' };
  }

  /** Đổi oauth code (một lần, 10 phút) lấy access token và refresh token. */
  exchangeCode(code: string, verifier: string) {
    const body = new URLSearchParams({
      code,
      app_id: this.appId(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    });
    return this.tokenRequest(body);
  }

  /** Refresh token dùng một lần. Token mới trong kết quả phải được lưu, token cũ hết hiệu lực. */
  refresh(refreshToken: string) {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      app_id: this.appId(),
      grant_type: 'refresh_token',
    });
    return this.tokenRequest(body);
  }

  private appId() {
    const appId = this.config.get<string>('ZALO_APP_ID')?.trim();
    if (!appId) throw new UnauthorizedException('Server chưa cấu hình ZALO_APP_ID');
    return appId;
  }

  private async tokenRequest(body: URLSearchParams): Promise<ZaloTokens> {
    const secret = this.config.get<string>('ZALO_APP_SECRET')?.trim();
    if (!secret) throw new UnauthorizedException('Server chưa cấu hình ZALO_APP_SECRET');
    let res: Response;
    try {
      res = await fetch('https://oauth.zaloapp.com/v4/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', secret_key: secret },
        body,
      });
    } catch (e) {
      this.log.warn(`Zalo token mạng: ${e instanceof Error ? e.message : 'lỗi'}`);
      throw new ServiceUnavailableException('Zalo đang bận. Bạn thử lại nhé.');
    }
    const data = (await res.json().catch(() => null)) as ZaloTokenBody | null;
    if (!data?.access_token) {
      this.log.warn(`Zalo từ chối cấp token: ${data?.error ?? res.status} ${data?.error_name || ''}`);
      throw new UnauthorizedException('Đăng nhập Zalo chưa xong. Bạn thử lại nhé.');
    }
    if (!data.refresh_token) this.log.warn('Zalo không trả refresh token');
    const seconds = Math.max(60, Number(data.expires_in) || 3600);
    return {
      access: data.access_token,
      refresh: data.refresh_token || '',
      exp: new Date(Date.now() + seconds * 1000),
    };
  }

  private async graph(token: string, fields: string): Promise<ZaloMe> {
    const secret = this.config.get<string>('ZALO_APP_SECRET');
    if (!secret) throw new UnauthorizedException('Server chưa cấu hình ZALO_APP_SECRET');
    const proof = createHmac('sha256', secret).update(token).digest('hex');
    const res = await fetch(`https://graph.zalo.me/v2.0/me?fields=${fields}`, {
      headers: { access_token: token, appsecret_proof: proof },
    });
    const text = await res.text();
    try {
      return parseZaloMe(text);
    } catch (e) {
      this.log.warn(`Zalo Graph không đọc được: ${e instanceof Error ? e.message : 'lỗi'}`);
      return {};
    }
  }
}
