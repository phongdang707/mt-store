import { ConfigService } from '@nestjs/config';
import { FacebookService, parseFacebookMe } from './facebook.service.js';

function service() {
  const env: Record<string, string> = {
    FACEBOOK_APP_ID: '99',
    FACEBOOK_APP_SECRET: 'sekret',
    FACEBOOK_REDIRECT_URI: 'http://localhost:3001/facebook/callback',
  };
  return new FacebookService({ get: (key: string) => env[key] } as ConfigService);
}

describe('parseFacebookMe', () => {
  it('giữ id dài là chuỗi', () => {
    const raw = '{"id":"9876543210987654321","name":"An"}';
    expect(parseFacebookMe(raw).id).toBe('9876543210987654321');
    expect(parseFacebookMe('{"error":0,"id":123}').id).toBe('123');
  });
});

describe('FacebookService token', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
  });

  it('đổi oauth code bằng secret trong body', async () => {
    const sent = { url: '', body: '' };
    global.fetch = (async (url: string, init?: RequestInit) => {
      sent.url = String(url);
      sent.body = String(init?.body);
      return new Response(JSON.stringify({ access_token: 'acc', expires_in: 3600 }), { status: 200 });
    }) as typeof fetch;
    const tokens = await service().exchangeCode('oauth-code');
    expect(sent.url).toBe('https://graph.facebook.com/v21.0/oauth/access_token');
    expect(sent.url).not.toContain('sekret');
    const body = new URLSearchParams(sent.body);
    expect(body.get('code')).toBe('oauth-code');
    expect(body.get('client_secret')).toBe('sekret');
    expect(body.get('redirect_uri')).toBe('http://localhost:3001/facebook/callback');
    expect(tokens.access).toBe('acc');
  });

  it('từ chối khi Facebook không cấp access token', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ error: { message: 'Invalid code', code: 100 } }), { status: 400 })) as typeof fetch;
    await expect(service().exchangeCode('bad')).rejects.toThrow('Đăng nhập Facebook chưa xong');
  });

  it('đọc id, tên, email và ảnh', async () => {
    global.fetch = (async () =>
      new Response(
        JSON.stringify({ id: '42', name: 'An', email: 'a@b.c', picture: { data: { url: 'https://cdn.example/a.jpg' } } }),
        { status: 200 },
      )) as typeof fetch;
    await expect(service().identity('tok')).resolves.toEqual({
      id: '42',
      name: 'An',
      email: 'a@b.c',
      avatar: 'https://cdn.example/a.jpg',
    });
  });
});
