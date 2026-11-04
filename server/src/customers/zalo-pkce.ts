import { createHash, randomInt } from 'node:crypto';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT = '0123456789';
const ALL = UPPER + LOWER + DIGIT;

/** 43 ký tự, có đủ chữ hoa, chữ thường và số. Mỗi lần đăng nhập một chuỗi mới. */
export function codeVerifier() {
  const chars = [UPPER[randomInt(UPPER.length)], LOWER[randomInt(LOWER.length)], DIGIT[randomInt(DIGIT.length)]];
  while (chars.length < 43) chars.push(ALL[randomInt(ALL.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const swap = chars[i];
    chars[i] = chars[j];
    chars[j] = swap;
  }
  return chars.join('');
}

/** Base64url không padding của SHA-256(ASCII(verifier)). Zalo OAuth v4, cùng cách SDK chính thức. */
export function codeChallenge(verifier: string) {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}
