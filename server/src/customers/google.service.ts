import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TOKEN = 'https://oauth2.googleapis.com/token';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface GoogleAccess {
  access: string;
}

interface TokenBody {
  access_token?: string;
  error?: string;
}

interface UserInfo {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean | string;
  picture?: string;
  error?: string;
}

/** Giữ `sub` là chuỗi. */
export function parseGoogleUser(text: string): UserInfo {
  let data: UserInfo = {};
  try {
    data = JSON.parse(text) as UserInfo;
  } catch {
    return {};
  }
  const quoted = text.match(/"sub"\s*:\s*"([^"]+)"/);
  const sub = quoted?.[1] || (data.sub ? String(data.sub) : '');
  if (sub) data.sub = sub;
  return data;
}

@Injectable()
export class GoogleService {
  private readonly log = new Logger(GoogleService.name);

  constructor(private readonly config: ConfigService) {}

  /** Chưa có Client Secret và không chạy production: cho phép header `x-dev-user`. */
  get devMode() {
    return !this.config.get('GOOGLE_CLIENT_SECRET') && this.config.get('NODE_ENV') !== 'production';
  }

  clientId() {
    return this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || '';
  }

  clientSecret() {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim() || '';
  }

  redirectUri() {
    return this.config.get<string>('GOOGLE_REDIRECT_URI')?.trim() || '';
  }

  /** Đổi oauth code lấy access token. Secret nằm trong body, không trên URL. */
  async exchangeCode(code: string): Promise<GoogleAccess> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: this.redirectUri(),
      grant_type: 'authorization_code',
    });
    let res: Response;
    try {
      res = await fetch(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    } catch (err) {
      this.log.warn(`Google không phản hồi: ${(err as Error).message}`);
      throw new UnauthorizedException('Đăng nhập Google chưa xong. Bạn thử lại nhé.');
    }
    let data: TokenBody = {};
    try {
      data = (await res.json()) as TokenBody;
    } catch {
      data = {};
    }
    if (!res.ok || !data.access_token) {
      this.log.warn(`Google từ chối token: ${res.status} ${data.error ?? ''}`);
      throw new UnauthorizedException('Đăng nhập Google chưa xong. Bạn thử lại nhé.');
    }
    return { access: data.access_token };
  }

  async identity(access: string): Promise<GoogleProfile> {
    const me = await this.userInfo(access);
    if (!me.sub) throw new UnauthorizedException('Google chưa trả danh tính. Bạn thử lại nhé.');
    return {
      id: me.sub,
      name: (me.name || '').trim().slice(0, 120),
      avatar: pictureOf(me.picture),
      email: emailOf(me),
    };
  }

  private async userInfo(access: string) {
    let res: Response;
    try {
      res = await fetch(USERINFO, { headers: { authorization: `Bearer ${access}` } });
    } catch (err) {
      this.log.warn(`Google không phản hồi: ${(err as Error).message}`);
      throw new UnauthorizedException('Đăng nhập Google chưa xong. Bạn thử lại nhé.');
    }
    const data = parseGoogleUser(await res.text());
    if (!res.ok || data.error) {
      this.log.warn(`Google từ chối hồ sơ: ${res.status} ${data.error ?? ''}`);
      return {};
    }
    return data;
  }
}

function pictureOf(raw: string | undefined) {
  const url = raw?.trim() || '';
  return url.startsWith('https://') || url.startsWith('http://') ? url.slice(0, 2000) : '';
}

function emailOf(me: UserInfo) {
  const verified = me.email_verified === true || me.email_verified === 'true';
  if (!verified) return '';
  const email = me.email?.trim().toLowerCase() || '';
  return email.includes('@') && email.length <= 200 ? email : '';
}
