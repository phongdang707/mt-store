import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

/** Bearer token, hoặc `?token=` cho EventSource (không gửi được header). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request & { admin?: unknown }>();
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) throw new UnauthorizedException();
    try {
      req.admin = await this.auth.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
  }
}
