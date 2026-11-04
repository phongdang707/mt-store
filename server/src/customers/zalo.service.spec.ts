import { ConfigService } from '@nestjs/config';
import { ZaloService } from './zalo.service.js';

function service() {
  const env: Record<string, string> = { ZALO_APP_ID: '99', ZALO_APP_SECRET: 'sekret' };
  return new ZaloService({ get: (key: string) => env[key] } as ConfigService);
}

describe('ZaloService token', () => {
  const original = global.fetch;

  afterEach(() => {
    global.fetch = original;
  });

  it('đổi oauth code bằng secret ở header và code_verifier', async () => {
    const sent = { url: '', secret: '', body: '' };
    global.fetch = (async (url: string, init: RequestInit) => {
      sent.url = String(url);
      sent.secret = new Headers(init.headers).get('secret_key') || '';
      sent.body = String(init.body);
      return new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref', expires_in: '3600' }), { status: 200 });
    }) as typeof fetch;
    const tokens = await service().exchangeCode('oauth-code', 'verifier-1');
    expect(sent.url).toBe('https://oauth.zaloapp.com/v4/access_token');
    expect(sent.secret).toBe('sekret');
    const body = new URLSearchParams(sent.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('oauth-code');
    expect(body.get('code_verifier')).toBe('verifier-1');
    expect(body.get('app_id')).toBe('99');
    expect(tokens.access).toBe('acc');
    expect(tokens.refresh).toBe('ref');
  });

  it('làm mới bằng refresh token một lần và không gửi verifier', async () => {
    let body = '';
    global.fetch = (async (_url: string, init: RequestInit) => {
      body = String(init.body);
      return new Response(JSON.stringify({ access_token: 'acc2', refresh_token: 'ref2', expires_in: 3600 }), { status: 200 });
    }) as typeof fetch;
    const tokens = await service().refresh('ref-old');
    const params = new URLSearchParams(body);
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe('ref-old');
    expect(params.get('code_verifier')).toBeNull();
    expect(tokens.refresh).toBe('ref2');
  });

  it('từ chối khi Zalo không cấp access token', async () => {
    global.fetch = (async () => new Response(JSON.stringify({ error: -14002, error_name: 'Invalid code' }), { status: 400 })) as typeof fetch;
    await expect(service().exchangeCode('bad', 'v')).rejects.toThrow('Đăng nhập Zalo chưa xong');
  });
});
