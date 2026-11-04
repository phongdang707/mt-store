import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type { LogListQuery } from './log.dto.js';
import { AppLog, type LogLevel, type LogSource } from './log.schema.js';
import { cleanMeta, cleanNotes, clip, fingerprintOf, isApiPath, isBeaconPath, isSkippedPath, redactPath, redactText, sourceOfPath, textOf } from './redact.js';
import { requestLog, type RequestLogState } from './request-log.js';

export interface LogInput {
  level: LogLevel;
  source: LogSource;
  message: string;
  status?: number;
  method?: string;
  path?: string;
  stack?: string;
  meta?: Record<string, unknown>;
  rid?: string;
  ms?: number;
  actor?: string;
  notes?: string[];
}

export interface FinishedRequest {
  status: number;
  method: string;
  path: string;
  ms: number;
  state: RequestLogState;
}

export interface LogReportGroup {
  fingerprint: string;
  count: number;
  lastAt: string;
  status?: number;
  path?: string;
  message: string;
  sampleId: string;
  level: LogLevel;
}

type LogRow = AppLog & { _id: unknown };

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const REPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function logFilter(q: { level?: LogLevel; source?: LogSource; q?: string; before?: string; actor?: string; rid?: string; fingerprint?: string }) {
  const filter: Record<string, unknown> = {};
  if (q.level) filter.level = q.level;
  if (q.source) filter.source = q.source;
  const actor = q.actor?.trim();
  const rid = q.rid?.trim();
  const fingerprint = q.fingerprint?.trim();
  if (actor) filter.actor = actor;
  if (rid) filter.rid = rid;
  if (fingerprint) filter.fingerprint = fingerprint;
  if (q.before && mongoose.Types.ObjectId.isValid(q.before)) filter._id = { $lt: new mongoose.Types.ObjectId(q.before) };
  const text = q.q?.trim();
  if (text) {
    const rx = new RegExp(escapeRegex(text), 'i');
    filter.$or = [{ message: rx }, { path: rx }, { notes: rx }, { actor: rx }];
  }
  return filter;
}

function levelOf(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function chosenSource(state: RequestLogState, path: string): LogSource {
  if (state.source === 'webhook' || state.source === 'zalo') return state.source;
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
    ...(doc.rid ? { rid: doc.rid } : {}),
    ...(typeof doc.ms === 'number' ? { ms: doc.ms } : {}),
    ...(doc.actor ? { actor: doc.actor } : {}),
    ...(full && doc.notes?.length ? { notes: doc.notes } : {}),
    ...(full && doc.stack ? { stack: doc.stack } : {}),
    ...(full && meta ? { meta } : {}),
  };
}

/** Gộp các dòng đã sắp theo thời gian. Cùng fingerprint là một nhóm. */
export function groupReports(rows: LogRow[]): LogReportGroup[] {
  const groups = new Map<string, LogReportGroup & { lastMs: number }>();
  for (const row of rows) {
    if (!row.fingerprint) continue;
    const at = new Date(row.at).getTime();
    const prev = groups.get(row.fingerprint);
    if (!prev) {
      groups.set(row.fingerprint, {
        fingerprint: row.fingerprint,
        count: 1,
        lastAt: new Date(row.at).toISOString(),
        lastMs: at,
        status: row.status,
        path: row.path,
        message: row.message,
        sampleId: String(row._id),
        level: row.level,
      });
      continue;
    }
    prev.count += 1;
    if (at >= prev.lastMs) {
      prev.lastMs = at;
      prev.lastAt = new Date(row.at).toISOString();
      prev.status = row.status;
      prev.path = row.path;
      prev.message = row.message;
      prev.sampleId = String(row._id);
      prev.level = row.level;
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.lastMs - a.lastMs)
    .slice(0, 50)
    .map(({ lastMs: _lastMs, ...item }) => item);
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
      const message = clip(redactText(textOf(input.message).trim()) || 'Lỗi', 500);
      const meta = cleanMeta(input.meta);
      const notes = cleanNotes(input.notes)?.filter((line) => line !== message);
      const actor = input.actor?.trim();
      const rid = input.rid?.trim();
      const doc = await this.logs.create({
        at: new Date(),
        level: input.level,
        source: input.source,
        message,
        ...(input.status ? { status: input.status } : {}),
        ...(input.method ? { method: clip(input.method, 12) } : {}),
        ...(input.path ? { path: redactPath(input.path) } : {}),
        ...(input.status && input.status >= 500 && input.stack ? { stack: clip(input.stack, 2048) } : {}),
        ...(rid ? { rid: clip(rid, 32) } : {}),
        ...(typeof input.ms === 'number' && Number.isFinite(input.ms) ? { ms: Math.max(0, Math.round(input.ms)) } : {}),
        ...(actor ? { actor: clip(actor, 200) } : {}),
        ...(notes?.length ? { notes } : {}),
        ...(input.status && input.status >= 400 ? { fingerprint: fingerprintOf(input.status, input.path || '', message) } : {}),
        ...(meta ? { meta } : {}),
      });
      return String(doc._id);
    } catch (e) {
      console.error('Không ghi được nhật ký:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  /** Một dòng cho request vừa kết thúc, kể cả khi thành công. */
  async recordFinished(input: FinishedRequest): Promise<void> {
    const { state } = input;
    if (state.skip || !isApiPath(input.path) || isSkippedPath(input.path)) return;
    if (input.status < 400 && isBeaconPath(input.method, input.path)) return;
    const message = state.failure?.message?.trim() || state.message?.trim() || 'OK';
    await this.record({
      level: levelOf(input.status),
      source: chosenSource(state, input.path),
      message,
      status: input.status,
      method: input.method,
      path: input.path,
      stack: state.failure?.stack,
      meta: state.meta,
      rid: state.rid,
      ms: input.ms,
      actor: state.actor,
      notes: state.notes,
    });
  }

  async list(q: LogListQuery) {
    const limit = q.limit ?? 50;
    const rows = await this.logs.find(logFilter(q)).sort({ _id: -1 }).limit(limit).select('-stack -meta -notes').lean<LogRow[]>().exec();
    return {
      items: rows.map((row) => present(row, false)),
      next: rows.length === limit ? String(rows[rows.length - 1]._id) : null,
    };
  }

  async report() {
    const since = new Date(Date.now() - REPORT_WINDOW_MS);
    const rows = await this.logs
      .find({ at: { $gte: since }, level: { $in: ['warn', 'error'] } })
      .sort({ at: -1 })
      .limit(5000)
      .select('fingerprint at status path message level')
      .lean<LogRow[]>()
      .exec();
    return { items: groupReports(rows) };
  }

  async one(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundException('Không có dòng nhật ký này');
    const doc = await this.logs.findById(id).lean<LogRow>().exec();
    if (!doc) throw new NotFoundException('Không có dòng nhật ký này');
    return present(doc, true);
  }
}
