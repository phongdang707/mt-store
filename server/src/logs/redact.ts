import type { LogSource } from './log.schema.js';

const SECRET_QUERY = new Set(['token', 'code', 'password', 'state', 'verifier', 'access_token', 'refresh_token', 'secret', 'signature', 'authorization', 'hub.verify_token', 'signed_request']);
const SECRET_META = new Set(['token', 'password', 'secret', 'signature', 'authorization', 'cookie', 'verifier', 'code', 'access_token', 'refresh_token', 'signed_request']);

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
  if (qIndex < 0) return clip(value.replace(/\/invoices\/[^/]+/g, '/invoices/:token'), 500);
  const path = value.slice(0, qIndex).replace(/\/invoices\/[^/]+/g, '/invoices/:token');
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

export function isApiPath(path: string) {
  const p = (path || '').split('?')[0];
  return p === '/api' || p.startsWith('/api/');
}

export function isSkippedPath(path: string) {
  const p = (path || '').split('?')[0];
  return p === '/api/health' || p.startsWith('/api/health/') || p === '/api/admin/logs' || p.startsWith('/api/admin/logs/');
}

/** Beacon phân tích chạy liên tục. Thành công thì không ghi; lỗi vẫn ghi. */
export function isBeaconPath(method: string, path: string) {
  if ((method || '').toUpperCase() !== 'POST') return false;
  const p = (path || '').split('?')[0];
  return p === '/api/me/visit' || p === '/api/me/events';
}

const MONGO_ID = /^[a-f0-9]{24}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_CODE = /^(?:MT\d{6}|TH\d{4,5})$/;

/** Bỏ id, mã đơn, và đoạn số để các lần cùng một lỗi gom được. */
export function normalizePath(raw: string): string {
  return redactPath(raw)
    .split('?')[0]
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      if (MONGO_ID.test(seg) || UUID.test(seg) || ORDER_CODE.test(seg) || seg.length >= 20) return ':id';
      if (/^\d+$/.test(seg)) return ':n';
      return seg;
    })
    .join('/');
}

export function fingerprintOf(status: number, path: string, message: string) {
  return clip(`${status} ${normalizePath(path)} ${message.trim()}`, 240);
}

export function cleanNotes(notes?: string[]): string[] | undefined {
  if (!notes?.length) return undefined;
  const out: string[] = [];
  for (const raw of notes) {
    if (out.length >= 8) break;
    const line = clip(redactText(raw.trim()), 200);
    if (line) out.push(line);
  }
  return out.length ? out : undefined;
}

export function sourceOfPath(path: string): LogSource {
  const p = path.split('?')[0];
  if (p.includes('/zalo/webhook') || p.includes('/facebook/webhook') || p.includes('/facebook/deletion')) return 'webhook';
  if (p.includes('/auth/facebook') || p.includes('/facebook')) return 'facebook';
  if (p.includes('/auth/zalo') || p.includes('/zalo')) return 'zalo';
  return 'http';
}

export function sourceOfContext(context?: string): LogSource {
  if (context === 'ZaloWebhookService' || context === 'FacebookWebhookService') return 'webhook';
  if (context === 'MessengerService') return 'facebook';
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
