import { randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomersService } from './customers.service.js';
import { ZaloLoginState } from './zalo-login-state.schema.js';
import { codeChallenge, codeVerifier } from './zalo-pkce.js';
import { ZaloService } from './zalo.service.js';

const STATE_MS = 10 * 60_000;

@Injectable()
export class ZaloAuthService {
  private readonly log = new Logger(ZaloAuthService.name);
  private readonly refreshing = new Map<string, Promise<string>>();

  constructor(
    private readonly config: ConfigService,
    private readonly zalo: ZaloService,
    private readonly customers: CustomersService,
    private readonly sessions: CustomerSessionService,
    @InjectModel(ZaloLoginState.name) private readonly states: Model<ZaloLoginState>,
  ) {}

  /** URL ủy quyền. `code_verifier` ở lại server, gắn với `state`. */
  async start() {
    const appId = this.config.get<string>('ZALO_APP_ID')?.trim();
    const redirect = this.config.get<string>('ZALO_REDIRECT_URI')?.trim();
    const secret = this.config.get<string>('ZALO_APP_SECRET')?.trim();
    if (!appId || !redirect || !secret) throw new ServiceUnavailableException('Server chưa cấu hình đăng nhập Zalo');
    const verifier = codeVerifier();
    const state = randomBytes(16).toString('hex');
    await this.states.create({ state, verifier, exp: new Date(Date.now() + STATE_MS) });
    const url = new URL('https://oauth.zaloapp.com/v4/permission');
    url.searchParams.set('app_id', appId);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('code_challenge', codeChallenge(verifier));
    url.searchParams.set('state', state);
    return { url: url.toString() };
  }

  /** Đổi `code` một lần, lấy Graph id, cấp JWT khách. Không trả refresh token ra ngoài. */
  async exchange(code: string, state: string) {
    const row = await this.states.findOneAndDelete({ state, exp: { $gt: new Date() } }).exec();
    if (!row) throw new UnauthorizedException('Phiên đăng nhập Zalo đã hết hạn. Bạn thử lại nhé.');
    const tokens = await this.zalo.exchangeCode(code, row.verifier);
    const me = await this.zalo.identity(tokens.access);
    if (!me.id) throw new UnauthorizedException('Zalo chưa trả danh tính. Bạn thử lại nhé.');
    const customer = await this.customers.upsert({ id: me.id });
    if (!customer) throw new UnauthorizedException('Chưa tạo được tài khoản');
    if (customer.blocked) throw new ForbiddenException('Hệ thống đang bảo trì. Bạn quay lại sau nhé.');
    await this.customers.saveZaloTokens(customer._id, tokens);
    if (me.name || me.avatar) await this.customers.syncProfile(customer._id, { zaloName: me.name, avatar: me.avatar });
    return { token: await this.sessions.sign(String(customer._id)) };
  }

  /** Tên và ảnh bằng access token đã lưu. Hết hạn thì đổi refresh token một lần. */
  async storedProfile(customerId: unknown) {
    const access = await this.accessToken(customerId);
    if (!access) return { name: '', avatar: '' };
    return this.zalo.profile(access);
  }

  private accessToken(customerId: unknown) {
    const key = String(customerId);
    const hit = this.refreshing.get(key);
    if (hit) return hit;
    const task = this.loadAccess(key).finally(() => {
      if (this.refreshing.get(key) === task) this.refreshing.delete(key);
    });
    this.refreshing.set(key, task);
    return task;
  }

  private async loadAccess(id: string) {
    const row = await this.customers.zaloSession(id);
    if (!row) return '';
    const exp = row.zaloAccessExp ? new Date(row.zaloAccessExp).getTime() : 0;
    if (row.zaloAccessToken && exp > Date.now() + 30_000) return row.zaloAccessToken;
    if (!row.zaloRefreshToken) return '';
    try {
      const tokens = await this.zalo.refresh(row.zaloRefreshToken);
      const saved = await this.customers.saveZaloTokens(id, tokens, row.zaloRefreshToken);
      if (saved) return tokens.access;
    } catch (e) {
      this.log.warn(`Không làm mới token Zalo: ${e instanceof Error ? e.message : 'lỗi'}`);
    }
    const again = await this.customers.zaloSession(id);
    const againExp = again?.zaloAccessExp ? new Date(again.zaloAccessExp).getTime() : 0;
    if (again?.zaloAccessToken && againExp > Date.now() + 5_000) return again.zaloAccessToken;
    return '';
  }
}
