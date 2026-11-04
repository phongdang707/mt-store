import { ConsoleLogger } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { calledContext, sourceOfContext, textOf } from './redact.js';
import { requestLog } from './request-log.js';

const SKIP = new Set(['ExceptionsHandler', 'LogsService', 'PersistLogger']);

/** Đưa Logger.warn / Logger.error vào Mongo. Bỏ qua lỗi Nest đã ghi ở filter. */
export class PersistLogger extends ConsoleLogger {
  constructor(private readonly logs: LogsService) {
    super();
  }

  override error(message: unknown, ...optionalParams: unknown[]) {
    super.error(message, ...(optionalParams as [string?, string?]));
    this.keep('error', message, optionalParams);
  }

  override warn(message: unknown, ...optionalParams: unknown[]) {
    super.warn(message, ...(optionalParams as [string?]));
    this.keep('warn', message, optionalParams);
  }

  private keep(level: 'error' | 'warn', message: unknown, params: unknown[]) {
    const context = calledContext(params);
    if (context && SKIP.has(context)) return;
    const ctx = requestLog.getStore();
    if (ctx?.skip || ctx?.id || ctx?.pending) return;
    const task = this.logs.record({
      level,
      source: sourceOfContext(context),
      message: textOf(message),
    });
    if (ctx) ctx.pending = task;
    else void task;
  }
}
