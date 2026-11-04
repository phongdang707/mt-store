import { UnauthorizedException } from '@nestjs/common';

/** JWT khách (`aud: customer`) không được vào API admin. */
export function assertAdminClaims(claims: { email?: string; aud?: string | string[] }) {
  const aud = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (aud.includes('customer') || !claims.email) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
}
