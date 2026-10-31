import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const run = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await run(pw, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const want = Buffer.from(hex, 'hex');
  const got = await run(pw, salt, want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}
