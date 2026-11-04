import type { LogSource } from './log.schema.js';

const SECRET_QUERY = new Set(['token', 'code', 'password', 'state', 'verifier', 'access_token', 'refresh_token', 'secret', 'signature', 'authorization']);
const SECRET_META = new Set(['token', 'password', 'secret', 'signature', 'authorization', 'cookie', 'verifier', 'code', 'access_token', 'refresh_token']);

export const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

export function textOf(message: unknown): string {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.message || message.name;
  if (message === undefined || message === null) return '';
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

/** Ẩn query bí mật. Header không được lưu. */
export function redactPath(raw: string): string {
  const value = String(raw || '');
  const qIndex = value.indexOf('?');
  if (qIndex < 0) return clip(value, 500);
  const path = value.slice(0, qIndex);
  const params = new URLSearchParams(value.slice(qIndex + 1));
  for (const key of Array.from(params.keys())) {
    if (SECRET_QUERY.has(key.toLowerCase())) params.set(key, '***');
  }
  const q = params.toString();
  return clip(q ? `${path}?${q}` : path, 500);
}

/** Ẩn query bí mật nếu message lỡ chứa URL. */
export function redactText(s: string): string {
  return s.replace(/([?&](?:token|code|password|state|verifier|access_token|refresh_token|secret|signature|authorization)=)[^&\s]+/gi, '$1***');
}

export function isSkippedPath(path: string) {
  const p = (path || '').split('?')[0];
  return p === '/api/health' || p.startsWith('/api/health/') || p === '/api/admin/logs' || p.startsWith('/api/admin/logs/');
}

export function sourceOfPath(path: string): LogSource {
  const p = path.split('?')[0];
  if (p.includes('/zalo/webhook')) return 'webhook';
  if (p.includes('/auth/zalo') || p.includes('/zalo')) return 'zalo';
  return 'http';
}

export function sourceOfContext(context?: string): LogSource {
  if (context === 'ZaloWebhookService') return 'webhook';
  if (context === 'ZaloService' || context === 'ZaloAuthService') return 'zalo';
  return 'app';
}

/** Context Nest gắn ở tham số cuối, trừ khi đó là stack. */
export function calledContext(params: unknown[]): string | undefined {
  const last = params[params.length - 1];
  if (typeof last !== 'string' || !last) return undefined;
  if (/\n[ \t]+at .+:\d+:\d+/.test(last)) return undefined;
  return last;
}

export function cleanMeta(meta?: Record<string, unknown>): Record<string, string | number> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (Object.keys(out).length >= 8) break;
    const name = key.trim().slice(0, 40);
    if (!name || SECRET_META.has(name.toLowerCase())) continue;
    if (typeof value === 'number' && Number.isFinite(value)) out[name] = value;
    else if (typeof value === 'string' && value.trim()) out[name] = value.trim().slice(0, 200);
  }
  return Object.keys(out).length ? out : undefined;
}
