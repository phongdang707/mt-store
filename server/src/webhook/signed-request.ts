import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SignedRequest {
  algorithm?: string;
  user_id?: string;
}

function decode(part: string) {
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
  return Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

/** `signed_request` của Facebook: HMAC-SHA256 của payload, khóa là app secret. */
export function parseSignedRequest(signed: string, secret: string): SignedRequest | null {
  const dot = signed.indexOf('.');
  if (dot <= 0) return null;
  const encodedSig = signed.slice(0, dot);
  const payload = signed.slice(dot + 1);
  if (!payload) return null;
  const sig = decode(encodedSig);
  const expected = createHmac('sha256', secret).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(decode(payload).toString('utf8')) as SignedRequest;
    if (data.algorithm && data.algorithm !== 'HMAC-SHA256') return null;
    return data;
  } catch {
    return null;
  }
}

/** `X-Hub-Signature-256: sha256=<hex>` trên raw body. */
export function hubSignatureMatches(raw: Buffer, secret: string, header: string | undefined) {
  if (!header?.startsWith('sha256=')) return false;
  const given = header.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/i.test(given)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'));
}
