import { codeChallenge, codeVerifier } from './zalo-pkce.js';

describe('codeVerifier', () => {
  it('dài 43 ký tự và có đủ hoa, thường, số', () => {
    for (let i = 0; i < 20; i++) {
      const value = codeVerifier();
      expect(value).toHaveLength(43);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[0-9]/);
      expect(value).toMatch(/^[A-Za-z0-9]+$/);
    }
  });

  it('mỗi lần một chuỗi khác', () => {
    const a = new Set(Array.from({ length: 10 }, () => codeVerifier()));
    expect(a.size).toBe(10);
  });
});

describe('codeChallenge', () => {
  it('là SHA-256 rồi Base64url, bỏ padding', () => {
    const verifier = 'Aa1' + 'b'.repeat(40);
    expect(codeChallenge(verifier)).toBe('T6m3Vs21sclDoQCMroV_DKJDrJq_JQEs6Cnov_4WDic');
    expect(codeChallenge(verifier)).not.toMatch(/[+/=]/);
  });
});
