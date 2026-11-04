import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LogsService } from './logs.service.js';

function statusOf(exception: unknown) {
  return exception instanceof HttpException ? exception.getStatus() : 500;
}

function messageOf(exception: unknown) {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (Array.isArray(message)) return message.map(String).join('; ');
      if (typeof message === 'string') return message;
    }
    return exception.message;
  }
  if (exception instanceof Error && exception.message) return exception.message;
  return 'Internal server error';
}

function responseBody(exception: unknown, status: number): Record<string, unknown> {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (body && typeof body === 'object') return body as Record<string, unknown>;
    return { statusCode: status, message: body };
  }
  return { statusCode: status, message: 'Internal server error' };
}

/** Mọi response API từ 400 trở lên vào nhật ký, rồi trả đúng body Nest vẫn trả. */
@Catch()
export class LogExceptionFilter implements ExceptionFilter {
  constructor(private readonly logs: LogsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = statusOf(exception);
    if (status >= 400) {
      void this.logs.recordHttp({
        status,
        method: req.method || '',
        path: req.originalUrl || req.url || '',
        message: messageOf(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }
    if (!(exception instanceof HttpException)) new Logger('ExceptionsHandler').error(exception);
    if (!res.headersSent) res.status(status).json(responseBody(exception, status));
  }
}
