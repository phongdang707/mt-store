import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type { LogListQuery } from './log.dto.js';
import { AppLog, type LogLevel, type LogSource } from './log.schema.js';
import { cleanMeta, clip, isSkippedPath, redactPath, redactText, sourceOfPath, textOf } from './redact.js';
import { requestLog } from './request-log.js';

const RANK: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 };

export interface LogInput {
  level: LogLevel;
  source: LogSource;
  message: string;
  status?: number;
  method?: string;
  path?: string;
  stack?: string;
  meta?: Record<string, unknown>;
}

export interface HttpFailure {
  status: number;
  method: string;
  path: string;
  message: string;
  stack?: string;
}

type LogRow = AppLog & { _id: unknown };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function logFilter(q: { level?: LogLevel; source?: LogSource; q?: string; before?: string }) {
  const filter: Record<string, unknown> = {};
  if (q.level) filter.level = q.level;
  if (q.source) filter.source = q.source;
  if (q.before && mongoose.Types.ObjectId.isValid(q.before)) filter._id = { $lt: new mongoose.Types.ObjectId(q.before) };
  const text = q.q?.trim();
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    filter.$or = [{ message: rx }, { path: rx }];
  }
  return filter;
}

function louder(current: LogLevel, status: number): LogLevel {
  const incoming: LogLevel = status >= 500 ? 'error' : 'warn';
  return RANK[incoming] > RANK[current] ? incoming : current;
}

function mergeSource(current: LogSource, path: string): LogSource {
  if (current === 'webhook' || current === 'zalo') return current;
  return sourceOfPath(path);
}

function present(doc: LogRow, full: boolean) {
  const meta = doc.meta && Object.keys(doc.meta).length ? doc.meta : undefined;
  return {
    id: String(doc._id),
    at: new Date(doc.at).toISOString(),
    level: doc.level,
    source: doc.source,
    message: doc.message,
    ...(doc.status ? { status: doc.status } : {}),
    ...(doc.method ? { method: doc.method } : {}),
    ...(doc.path ? { path: doc.path } : {}),
    ...(full && doc.stack ? { stack: doc.stack } : {}),
    ...(full && meta ? { meta } : {}),
  };
}

@Injectable()
export class LogsService {
  constructor(@InjectModel(AppLog.name) private readonly logs: Model<AppLog>) {}

  /** Ghi một dòng. Nuốt lỗi ghi để không làm hỏng request. */
  async record(input: LogInput): Promise<string | null> {
    const ctx = requestLog.getStore();
    if (ctx?.skip) return null;
    if (input.path && isSkippedPath(input.path)) return null;
    try {
      const meta = cleanMeta(input.meta);
      const doc = await this.logs.create({
        at: new Date(),
        level: input.level,
        source: input.source,
        message: clip(redactText(textOf(input.message).trim()) || 'Lỗi', 500),
        ...(input.status ? { status: input.status } : {}),
        ...(input.method ? { method: clip(input.method, 12) } : {}),
        ...(input.path ? { path: redactPath(input.path) } : {}),
        ...(input.status && input.status >= 500 && input.stack ? { stack: clip(input.stack, 2048) } : {}),
        ...(meta ? { meta } : {}),
      });
      const id = String(doc._id);
      if (ctx) ctx.id = id;
      return id;
    } catch (e) {
      console.error('Không ghi được nhật ký:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  /** Request lỗi: gắn vào dòng Logger đã ghi, hoặc tạo dòng mới. */
  async recordHttp(input: HttpFailure): Promise<void> {
    const ctx = requestLog.getStore();
    if (ctx?.skip || isSkippedPath(input.path) || input.status < 400) return;
    try {
      if (ctx?.pending) await ctx.pending;
      if (ctx?.id) {
        await this.attach(ctx.id, input);
        return;
      }
      await this.record({
        level: input.status >= 500 ? 'error' : 'warn',
        source: sourceOfPath(input.path),
        message: input.message,
        status: input.status,
        method: input.method,
        path: input.path,
        stack: input.stack,
      });
    } catch (e) {
      console.error('Không ghi được nhật ký:', e instanceof Error ? e.message : e);
    }
  }

  async list(q: LogListQuery) {
    const limit = q.limit ?? 50;
    const rows = await this.logs.find(logFilter(q)).sort({ _id: -1 }).limit(limit).select('-stack -meta').lean<LogRow[]>().exec();
    return {
      items: rows.map((row) => present(row, false)),
      next: rows.length === limit ? String(rows[rows.length - 1]._id) : null,
    };
  }

  async one(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundException('Không có dòng nhật ký này');
    const doc = await this.logs.findById(id).lean<LogRow>().exec();
    if (!doc) throw new NotFoundException('Không có dòng nhật ký này');
    return present(doc, true);
  }

  private async attach(id: string, http: HttpFailure) {
    const doc = await this.logs.findById(id).lean<LogRow>().exec();
    if (!doc) return;
    const $set: Record<string, unknown> = {
      status: http.status,
      method: clip(http.method || '', 12),
      path: redactPath(http.path),
      source: mergeSource(doc.source, http.path),
      level: louder(doc.level, http.status),
    };
    if (http.status >= 500 && http.stack) $set.stack = clip(http.stack, 2048);
    await this.logs.updateOne({ _id: id }, { $set }).exec();
  }
}
