import { ConsoleLogger } from '@nestjs/common';
import { LogsService } from './logs.service.js';
import { calledContext, sourceOfContext, textOf } from './redact.js';
import { pushNote, requestLog } from './request-log.js';

const SKIP = new Set(['ExceptionsHandler', 'LogsService', 'PersistLogger']);

/** Đưa Logger.warn / Logger.error vào nhật ký. Trong request thì gom lại, ghi một lần lúc kết thúc. */
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
    const text = textOf(message);
    const ctx = requestLog.getStore();
    if (ctx) {
      pushNote(text, sourceOfContext(context));
      return;
    }
    void this.logs.record({
      level,
      source: sourceOfContext(context),
      message: text,
    });
  }
}
