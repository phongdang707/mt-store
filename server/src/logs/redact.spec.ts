import mongoose from 'mongoose';
import { logFilter } from './logs.service.js';
import { calledContext, cleanMeta, isSkippedPath, redactPath, redactText, sourceOfContext, sourceOfPath } from './redact.js';

describe('redact', () => {
  it('ẩn query bí mật và giữ phần còn lại', () => {
    const path = redactPath('/api/admin/events?token=abc&x=1');
    const params = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith('/api/admin/events?')).toBe(true);
    expect(params.get('token')).toBe('***');
    expect(params.get('x')).toBe('1');
    expect(path).not.toContain('abc');
  });

  it('ẩn code, password, state, verifier', () => {
    const path = redactPath('/api/auth/zalo/exchange?code=1&state=2&verifier=3&password=4');
    expect(path).not.toContain('=1');
    expect(path).not.toContain('=2');
    expect(path).not.toContain('=3');
    expect(path).not.toContain('=4');
    expect(redactPath('/api/orders')).toBe('/api/orders');
  });

  it('ẩn query dính trong message', () => {
    expect(redactText('thất bại /api/auth/zalo/exchange?code=secret&ok=1')).toBe('thất bại /api/auth/zalo/exchange?code=***&ok=1');
  });

  it('bỏ meta nhạy cảm', () => {
    expect(cleanMeta({ event: 'user.revoke.consent', signature: 'abc', token: 't', code: 'c' })).toEqual({
      event: 'user.revoke.consent',
    });
  });

  it('nhận nguồn theo path và context', () => {
    expect(sourceOfPath('/api/zalo/webhook')).toBe('webhook');
    expect(sourceOfPath('/api/auth/zalo/exchange?code=1')).toBe('zalo');
    expect(sourceOfPath('/api/orders')).toBe('http');
    expect(sourceOfContext('ZaloWebhookService')).toBe('webhook');
    expect(sourceOfContext('ZaloService')).toBe('zalo');
    expect(sourceOfContext('ZaloAuthService')).toBe('zalo');
    expect(sourceOfContext('OrdersService')).toBe('app');
  });

  it('bỏ qua health và API đọc nhật ký', () => {
    expect(isSkippedPath('/api/health')).toBe(true);
    expect(isSkippedPath('/api/admin/logs?level=error')).toBe(true);
    expect(isSkippedPath('/api/admin/logs/abc')).toBe(true);
    expect(isSkippedPath('/api/orders')).toBe(false);
  });

  it('lấy context ở tham số cuối, không nhầm stack', () => {
    expect(calledContext([undefined, 'ZaloService'])).toBe('ZaloService');
    expect(calledContext(['Error: x\n    at fn (a.ts:1:1)'])).toBeUndefined();
    expect(calledContext(['Error: x\n    at fn (a.ts:1:1)', 'ExceptionsHandler'])).toBe('ExceptionsHandler');
  });
});

describe('logFilter', () => {
  it('lọc mức, nguồn, chữ, và cursor', () => {
    const before = new mongoose.Types.ObjectId().toHexString();
    const filter = logFilter({ level: 'error', source: 'http', q: 'a+b', before });
    expect(filter.level).toBe('error');
    expect(filter.source).toBe('http');
    expect(filter._id).toEqual({ $lt: new mongoose.Types.ObjectId(before) });
    const or = filter.$or as { message: RegExp }[];
    expect(or[0].message.test('a+b')).toBe(true);
    expect(or[0].message.test('ab')).toBe(false);
  });
});
