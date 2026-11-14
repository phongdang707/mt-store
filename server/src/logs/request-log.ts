import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import type { LogSource } from './log.schema.js';

const SOURCE_RANK: Record<LogSource, number> = { http: 0, app: 1, zalo: 2, facebook: 2, webhook: 3 };

export interface RequestFailure {
  status: number;
  message: string;
  stack?: string;
}

/** Trạng thái nhật ký của request hiện tại. Một request chỉ một dòng, ghi khi response kết thúc. */
export interface RequestLogState {
  skip: boolean;
  rid: string;
  started: number;
  actor?: string;
  notes: string[];
  source?: LogSource;
  message?: string;
  meta?: Record<string, unknown>;
  failure?: RequestFailure;
}

export const requestLog = new AsyncLocalStorage<RequestLogState>();

export function openRequest(skip: boolean): RequestLogState {
  return { skip, rid: randomBytes(6).toString('hex'), started: Date.now(), notes: [] };
}

export function setActor(actor: string) {
  const ctx = requestLog.getStore();
  const name = actor.trim();
  if (!ctx || ctx.skip || !name) return;
  ctx.actor = name;
}

export function setRequestMeta(meta: Record<string, unknown>) {
  const ctx = requestLog.getStore();
  if (!ctx || ctx.skip) return;
  ctx.meta = { ...ctx.meta, ...meta };
}

export function setRequestMessage(message: string, meta?: Record<string, unknown>) {
  const ctx = requestLog.getStore();
  if (!ctx || ctx.skip) return;
  ctx.message = message;
  if (meta) ctx.meta = { ...ctx.meta, ...meta };
}

/** Gom cảnh báo trong request. Không ghi Mongo cho đến khi response kết thúc. */
export function pushNote(text: string, source?: LogSource) {
  const ctx = requestLog.getStore();
  if (!ctx || ctx.skip) return;
  if (source && (!ctx.source || SOURCE_RANK[source] >= SOURCE_RANK[ctx.source])) ctx.source = source;
  const line = text.trim();
  if (!line || ctx.notes.length >= 8) return;
  ctx.notes.push(line.length > 2000 ? line.slice(0, 2000) : line);
}

export function setFailure(failure: RequestFailure) {
  const ctx = requestLog.getStore();
  if (!ctx || ctx.skip) return;
  ctx.failure = failure;
}
