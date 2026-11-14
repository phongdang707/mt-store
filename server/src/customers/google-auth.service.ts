import { randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { setActor } from '../logs/request-log.js';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomersService } from './customers.service.js';
import { GoogleService } from './google.service.js';
import { LoginState } from './login-state.schema.js';

const STATE_MS = 10 * 60_000;
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly google: GoogleService,
    private readonly customers: CustomersService,
    private readonly sessions: CustomerSessionService,
    @InjectModel(LoginState.name) private readonly states: Model<LoginState>,
  ) {}

  /** URL ủy quyền. `state` ở lại server để chống CSRF. */
  async start() {
    const clientId = this.google.clientId();
    const redirect = this.google.redirectUri();
    const secret = this.google.clientSecret();
    if (!clientId || !redirect || !secret) throw new ServiceUnavailableException('Server chưa cấu hình đăng nhập Google');
    const state = randomBytes(16).toString('hex');
    await this.states.create({ state, exp: new Date(Date.now() + STATE_MS) });
    const url = new URL(AUTH);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    return { url: url.toString() };
  }

  /** Đổi `code` một lần, lấy `sub`, cấp JWT khách. Không trả access token ra ngoài. */
  async exchange(code: string, state: string) {
    const row = await this.states.findOneAndDelete({ state, exp: { $gt: new Date() } }).exec();
    if (!row) throw new UnauthorizedException('Phiên đăng nhập Google đã hết hạn. Bạn thử lại nhé.');
    const token = await this.google.exchangeCode(code);
    const me = await this.google.identity(token.access);
    const customer = await this.customers.upsert({ id: me.id });
    if (!customer) throw new UnauthorizedException('Chưa tạo được tài khoản');
    setActor(String(customer._id));
    if (customer.blocked) throw new ForbiddenException('Hệ thống đang bảo trì. Bạn quay lại sau nhé.');
    if (me.name || me.avatar || me.email) {
      await this.customers.syncProfile(customer._id, { googleName: me.name, avatar: me.avatar, email: me.email });
    }
    return { token: await this.sessions.sign(String(customer._id)) };
  }
}
