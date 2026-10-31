import { BadRequestException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Admin } from './admin.schema.js';
import { hashPassword, verifyPassword } from './password.js';

export interface AdminClaims {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly log = new Logger(AuthService.name);

  constructor(
    @InjectModel(Admin.name) private readonly admins: Model<Admin>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Tạo tài khoản chủ shop từ ADMIN_EMAIL/ADMIN_PASSWORD nếu chưa có. */
  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      if (!(await this.admins.estimatedDocumentCount())) this.log.warn('Chưa có tài khoản admin: điền ADMIN_EMAIL và ADMIN_PASSWORD trong .env');
      return;
    }
    const admin = await this.admins.findOne({ email }).exec();
    if (!admin) {
      await this.admins.create({ email, passwordHash: await hashPassword(password), envPasswordHash: await hashPassword(password) });
      this.log.log(`Đã tạo tài khoản admin ${email}`);
      return;
    }
    // ADMIN_PASSWORD không đổi kể từ lần trước: giữ mật khẩu chủ shop tự đổi trong trang Cài đặt.
    if (admin.envPasswordHash && (await verifyPassword(password, admin.envPasswordHash))) return;
    // ADMIN_PASSWORD mới (hoặc bản ghi cũ chưa có dấu) = đặt lại mật khẩu theo env.
    if (!(await verifyPassword(password, admin.passwordHash))) {
      admin.passwordHash = await hashPassword(password);
      this.log.log(`Đã đặt lại mật khẩu admin ${email} theo ADMIN_PASSWORD`);
    }
    admin.envPasswordHash = await hashPassword(password);
    await admin.save();
  }

  async changePassword(id: string, current: string, next: string) {
    const admin = await this.admins.findById(id).exec();
    if (!admin || !(await verifyPassword(current, admin.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại chưa đúng');
    }
    admin.passwordHash = await hashPassword(next);
    await admin.save();
  }

  async login(email: string, password: string, remember: boolean) {
    const admin = await this.admins.findOne({ email: email.trim().toLowerCase() }).exec();
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu chưa đúng');
    }
    const claims: AdminClaims = { sub: String(admin._id), email: admin.email, name: admin.displayName };
    const token = await this.jwt.signAsync(claims, { expiresIn: remember ? '30d' : '12h' });
    return { token, admin: { email: admin.email, name: admin.displayName } };
  }

  verify(token: string) {
    return this.jwt.verifyAsync<AdminClaims>(token);
  }
}
