import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GRAPH = 'https://graph.facebook.com/v21.0';

export interface FacebookProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface FacebookAccess {
  access: string;
  exp: Date;
}

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number };
}

interface TokenBody extends GraphError {
  access_token?: string;
  expires_in?: number;
}

interface MeBody extends GraphError {
  id?: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

/** Giữ `id` là chuỗi. Graph đôi khi trả số dài. */
export function parseFacebookMe(text: string): MeBody {
  let data: MeBody = {};
  try {
    data = JSON.parse(text) as MeBody;
  } catch {
    return {};
  }
  const quoted = text.match(/"id"\s*:\s*"([^"]+)"/);
  const bare = text.match(/"id"\s*:\s*(\d{1,32})/);
  const id = quoted?.[1] || bare?.[1] || (data.id ? String(data.id) : '');
  if (id) data.id = id;
  return data;
}

@Injectable()
export class FacebookService {
  private readonly log = new Logger(FacebookService.name);

  constructor(private readonly config: ConfigService) {}

  /** Chưa có App Secret và không chạy production: cho phép header `x-dev-user`. */
  get devMode() {
    return !this.config.get('FACEBOOK_APP_SECRET') && this.config.get('NODE_ENV') !== 'production';
  }

  appId() {
    return this.config.get<string>('FACEBOOK_APP_ID')?.trim() || '';
  }

  appSecret() {
    return this.config.get<string>('FACEBOOK_APP_SECRET')?.trim() || '';
  }

  redirectUri() {
    return this.config.get<string>('FACEBOOK_REDIRECT_URI')?.trim() || '';
  }

  /** Đổi oauth code lấy access token ngắn hạn. Secret nằm trong body, không trên URL. */
  async exchangeCode(code: string) {
    const body = new URLSearchParams({
      client_id: this.appId(),
      client_secret: this.appSecret(),
      redirect_uri: this.redirectUri(),
      code,
    });
    return this.token(`${GRAPH}/oauth/access_token`, body);
  }

  /** Đổi token ngắn hạn sang bản khoảng 60 ngày. */
  async extend(access: string) {
    const body = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId(),
      client_secret: this.appSecret(),
      fb_exchange_token: access,
    });
    return this.token(`${GRAPH}/oauth/access_token`, body);
  }

  async identity(access: string): Promise<FacebookProfile> {
    const me = await this.me(access);
    if (!me.id) throw new UnauthorizedException('Facebook chưa trả danh tính. Bạn thử lại nhé.');
    return {
      id: me.id,
      name: (me.name || '').trim().slice(0, 120),
      avatar: pictureOf(me),
      email: emailOf(me.email),
    };
  }

  async profile(access: string) {
    const me = await this.me(access);
    return { name: (me.name || '').trim().slice(0, 120), avatar: pictureOf(me) };
  }

  private async me(access: string) {
    let res: Response;
    try {
      res = await fetch(`${GRAPH}/me?fields=id,name,picture`, { headers: { authorization: `Bearer ${access}` } });
    } catch (err) {
      this.log.warn(`Facebook không phản hồi: ${(err as Error).message}`);
      throw new UnauthorizedException('Đăng nhập Facebook chưa xong. Bạn thử lại nhé.');
    }
    const data = parseFacebookMe(await res.text());
    if (!res.ok || data.error) {
      this.log.warn(`Facebook từ chối hồ sơ: ${data.error?.code ?? res.status} ${data.error?.message ?? ''}`);
      return {};
    }
    return data;
  }

  private async token(url: string, body: URLSearchParams): Promise<FacebookAccess> {
    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    } catch (err) {
      this.log.warn(`Facebook không phản hồi: ${(err as Error).message}`);
      throw new UnauthorizedException('Đăng nhập Facebook chưa xong. Bạn thử lại nhé.');
    }
    let data: TokenBody = {};
    try {
      data = (await res.json()) as TokenBody;
    } catch {
      data = {};
    }
    if (!res.ok || !data.access_token) {
      this.log.warn(`Facebook từ chối token: ${data.error?.code ?? res.status} ${data.error?.message ?? ''}`);
      throw new UnauthorizedException('Đăng nhập Facebook chưa xong. Bạn thử lại nhé.');
    }
    const seconds = typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 60 * 24 * 60 * 60;
    return { access: data.access_token, exp: new Date(Date.now() + seconds * 1000) };
  }
}

function pictureOf(me: MeBody) {
  const url = me.picture?.data?.url?.trim() || '';
  return url.startsWith('https://') || url.startsWith('http://') ? url.slice(0, 2000) : '';
}

function emailOf(raw: string | undefined) {
  const email = raw?.trim().toLowerCase() || '';
  return email.includes('@') && email.length <= 200 ? email : '';
}
