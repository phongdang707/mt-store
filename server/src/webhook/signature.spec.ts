import { zaloEventSignature, signaturesMatch } from './signature.js';

const review = {
  event: 'versions.review.done',
  appId: '2646373759294038927',
  versionId: 101,
  status: 0,
  description: '',
  timestamp: 1670553442564,
};

describe('zaloEventSignature', () => {
  it('khớp mẫu trong tài liệu Zalo', () => {
    expect(zaloEventSignature(review, 'Your API Key')).toBe('53436871d0aec6332a473f909e067744b4a7c18c36d6aa36213b956423f020a5');
  });

  it('không phụ thuộc thứ tự key', () => {
    expect(zaloEventSignature({ b: 1, a: 2 }, 'k')).toBe(zaloEventSignature({ a: 2, b: 1 }, 'k'));
  });

  it('stringify object lồng nhau', () => {
    const flat = zaloEventSignature({ a: '{"z":1}' }, 'k');
    const nested = zaloEventSignature({ a: { z: 1 } }, 'k');
    expect(nested).toBe(flat);
  });
});

describe('signaturesMatch', () => {
  const sig = zaloEventSignature(review, 'Your API Key');

  it('chấp nhận hex hoa hoặc thường', () => {
    expect(signaturesMatch(sig, sig.toUpperCase())).toBe(true);
  });

  it('từ chối chữ ký sai hoặc thiếu', () => {
    expect(signaturesMatch(sig, sig.replace('5', '0'))).toBe(false);
    expect(signaturesMatch(sig, '')).toBe(false);
    expect(signaturesMatch(sig, 'not-hex')).toBe(false);
  });
});
