import { parseZaloMe } from './zalo.service.js';

describe('parseZaloMe', () => {
  it('giữ id dài hơn số an toàn của JS', () => {
    const id = '3368637342326461234';
    const raw = `{"id":${id},"name":"An"}`;
    expect(String((JSON.parse(raw) as { id: number }).id)).not.toBe(id);
    const me = parseZaloMe(raw);
    expect(me.id).toBe(id);
    expect(me.name).toBe('An');
  });

  it('nhận id trong chuỗi', () => {
    expect(parseZaloMe('{"error":0,"id":"9876543210987654321"}').id).toBe('9876543210987654321');
  });
});
