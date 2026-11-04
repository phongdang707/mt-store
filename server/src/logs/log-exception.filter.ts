import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { setFailure } from './request-log.js';

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

/** Nhét lỗi vào ngữ cảnh request. Dòng nhật ký được ghi khi response kết thúc. */
@Catch()
export class LogExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const status = statusOf(exception);
    if (status >= 400) {
      setFailure({
        status,
        message: messageOf(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }
    if (!(exception instanceof HttpException)) new Logger('ExceptionsHandler').error(exception);
    if (!res.headersSent) res.status(status).json(responseBody(exception, status));
  }
}
