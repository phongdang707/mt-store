import { createHmac } from 'node:crypto';
import { hubSignatureMatches, parseSignedRequest } from './signed-request.js';

function signed(payload: Record<string, unknown>, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${sig}.${body}`;
}

describe('parseSignedRequest', () => {
  it('đọc user id khi chữ ký đúng', () => {
    const value = signed({ algorithm: 'HMAC-SHA256', user_id: '998877' }, 'sekret');
    expect(parseSignedRequest(value, 'sekret')?.user_id).toBe('998877');
  });

  it('từ chối chữ ký sai', () => {
    const value = signed({ algorithm: 'HMAC-SHA256', user_id: '998877' }, 'sekret');
    expect(parseSignedRequest(value, 'other')).toBeNull();
  });
});

describe('hubSignatureMatches', () => {
  it('khớp sha256 của raw body', () => {
    const raw = Buffer.from('{"object":"page"}');
    const header = 'sha256=' + createHmac('sha256', 'sekret').update(raw).digest('hex');
    expect(hubSignatureMatches(raw, 'sekret', header)).toBe(true);
    expect(hubSignatureMatches(raw, 'sekret', 'sha256=aa')).toBe(false);
  });
});
