import { randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { setActor } from '../logs/request-log.js';
import { CustomerSessionService } from './customer-session.service.js';
import { CustomersService } from './customers.service.js';
import { FacebookService } from './facebook.service.js';
import { LoginState } from './login-state.schema.js';

const STATE_MS = 10 * 60_000;
const DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth';

@Injectable()
export class FacebookAuthService {
  private readonly log = new Logger(FacebookAuthService.name);

  constructor(
    private readonly facebook: FacebookService,
    private readonly customers: CustomersService,
    private readonly sessions: CustomerSessionService,
    @InjectModel(LoginState.name) private readonly states: Model<LoginState>,
  ) {}

  /** URL ủy quyền. `state` ở lại server để chống CSRF. */
  async start() {
    const appId = this.facebook.appId();
    const redirect = this.facebook.redirectUri();
    const secret = this.facebook.appSecret();
    if (!appId || !redirect || !secret) throw new ServiceUnavailableException('Server chưa cấu hình đăng nhập Facebook');
    const state = randomBytes(16).toString('hex');
    await this.states.create({ state, exp: new Date(Date.now() + STATE_MS) });
    const url = new URL(DIALOG);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'public_profile');
    url.searchParams.set('response_type', 'code');
    return { url: url.toString() };
  }

  /** Đổi `code` một lần, lấy Graph id, cấp JWT khách. Không trả access token ra ngoài. */
  async exchange(code: string, state: string) {
    const row = await this.states.findOneAndDelete({ state, exp: { $gt: new Date() } }).exec();
    if (!row) throw new UnauthorizedException('Phiên đăng nhập Facebook đã hết hạn. Bạn thử lại nhé.');
    const short = await this.facebook.exchangeCode(code);
    const tokens = await this.facebook.extend(short.access).catch((err: unknown) => {
      this.log.warn(`Không đổi được token dài hạn: ${(err as Error).message}`);
      return short;
    });
    const me = await this.facebook.identity(tokens.access);
    const customer = await this.customers.upsert({ id: me.id });
    if (!customer) throw new UnauthorizedException('Chưa tạo được tài khoản');
    setActor(String(customer._id));
    if (customer.blocked) throw new ForbiddenException('Hệ thống đang bảo trì. Bạn quay lại sau nhé.');
    await this.customers.saveFacebookToken(customer._id, tokens);
    if (me.name || me.avatar || me.email) {
      await this.customers.syncProfile(customer._id, { facebookName: me.name, avatar: me.avatar, email: me.email });
    }
    return { token: await this.sessions.sign(String(customer._id)) };
  }

  /** Tên và ảnh bằng access token đã lưu. Hết hạn thì trả trống, không xoá hồ sơ. */
  async storedProfile(customerId: unknown) {
    const row = await this.customers.facebookSession(customerId);
    const access = row?.facebookAccessToken?.trim() || '';
    const exp = row?.facebookAccessExp ? new Date(row.facebookAccessExp).getTime() : 0;
    if (!access || (exp && exp <= Date.now())) return { name: '', avatar: '' };
    try {
      return await this.facebook.profile(access);
    } catch (err) {
      this.log.warn(`Không đọc được hồ sơ Facebook: ${(err as Error).message}`);
      return { name: '', avatar: '' };
    }
  }
}
