import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

const AUDIENCE = 'customer';

@Injectable()
export class CustomerSessionService {
  constructor(private readonly jwt: JwtService) {}

  /** Phiên cửa hàng, độc lập với access token Facebook. */
  sign(customerId: string) {
    return this.jwt.signAsync({ sub: customerId }, { audience: AUDIENCE, expiresIn: '30d' });
  }

  async verify(token: string) {
    let sub = '';
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: string }>(token, { audience: AUDIENCE });
      sub = claims.sub ?? '';
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
    if (!Types.ObjectId.isValid(sub)) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    return sub;
  }
}
