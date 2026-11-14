import { ConfigService } from '@nestjs/config';
import { GoogleService, parseGoogleUser } from './google.service.js';

function service(extra: Record<string, string> = {}) {
  const env: Record<string, string> = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'sekret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3001/google/callback',
    ...extra,
  };
  return new GoogleService({ get: (key: string) => env[key] } as ConfigService);
}

describe('parseGoogleUser', () => {
  it('giữ sub dài là chuỗi', () => {
    const raw = '{"sub":"110169484474386276334","name":"An"}';
    expect(parseGoogleUser(raw).sub).toBe('110169484474386276334');
  });
});

describe('GoogleService', () => {
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
    expect(sent.url).toBe('https://oauth2.googleapis.com/token');
    expect(sent.url).not.toContain('sekret');
    const body = new URLSearchParams(sent.body);
    expect(body.get('code')).toBe('oauth-code');
    expect(body.get('client_secret')).toBe('sekret');
    expect(body.get('redirect_uri')).toBe('http://localhost:3001/google/callback');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(tokens.access).toBe('acc');
  });

  it('từ chối khi Google không cấp access token', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })) as typeof fetch;
    await expect(service().exchangeCode('bad')).rejects.toThrow('Đăng nhập Google chưa xong');
  });

  it('đọc sub, tên, email đã xác minh và ảnh', async () => {
    const sent = { url: '', auth: '' };
    global.fetch = (async (url: string, init?: RequestInit) => {
      sent.url = String(url);
      sent.auth = String((init?.headers as Record<string, string> | undefined)?.authorization ?? '');
      return new Response(
        JSON.stringify({
          sub: '42',
          name: 'An',
          email: 'a@b.c',
          email_verified: true,
          picture: 'https://cdn.example/a.jpg',
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    await expect(service().identity('tok')).resolves.toEqual({
      id: '42',
      name: 'An',
      email: 'a@b.c',
      avatar: 'https://cdn.example/a.jpg',
    });
    expect(sent.url).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    expect(sent.auth).toBe('Bearer tok');
  });

  it('bỏ email chưa xác minh', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ sub: '42', name: 'An', email: 'a@b.c', email_verified: false }), { status: 200 })) as typeof fetch;
    await expect(service().identity('tok')).resolves.toMatchObject({ id: '42', email: '' });
  });

  it('dev mode khi chưa có client secret và không phải production', () => {
    expect(service({ GOOGLE_CLIENT_SECRET: '' }).devMode).toBe(true);
    expect(service().devMode).toBe(false);
    expect(service({ GOOGLE_CLIENT_SECRET: '', NODE_ENV: 'production' }).devMode).toBe(false);
  });
});
