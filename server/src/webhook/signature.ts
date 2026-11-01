import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Chữ ký sự kiện Zalo: sắp key A→Z, nối giá trị, SHA-256 với API Key.
 * https://docs.zaloplatforms.com/docs/MA/openApis/open/webhook/verifysignature
 */
export function zaloEventSignature(data: Record<string, unknown>, apiKey: string) {
  let content = '';
  for (const key of Object.keys(data).sort()) {
    const raw = data[key];
    content += typeof raw === 'object' ? (JSON.stringify(raw) ?? '') : String(raw);
  }
  return createHash('sha256').update(`${content}${apiKey}`).digest('hex');
}

export function signaturesMatch(expected: string, given: string) {
  if (!/^[0-9a-f]{64}$/i.test(given)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'));
}
