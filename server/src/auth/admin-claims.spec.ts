import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { assertAdminClaims } from './admin-claims.js';

describe('assertAdminClaims', () => {
  const jwt = new JwtService({ secret: 'test-secret' });

  it('nhận phiên admin', async () => {
    const token = await jwt.signAsync({ sub: '1', email: 'a@b.c', name: 'A' }, { expiresIn: '1h' });
    const claims = await jwt.verifyAsync<{ email: string; aud?: string }>(token);
    expect(() => assertAdminClaims(claims)).not.toThrow();
  });

  it('từ chối JWT khách cùng khóa ký', async () => {
    const token = await jwt.signAsync({ sub: '507f1f77bcf86cd799439011' }, { audience: 'customer', expiresIn: '1h' });
    const claims = await jwt.verifyAsync<{ email?: string; aud?: string }>(token);
    expect(claims.aud).toBe('customer');
    expect(() => assertAdminClaims(claims)).toThrow(UnauthorizedException);
  });
});
