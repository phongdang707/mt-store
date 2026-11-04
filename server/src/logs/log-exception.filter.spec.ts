import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { LogExceptionFilter } from './log-exception.filter.js';
import type { HttpFailure, LogsService } from './logs.service.js';

function host(req: { method: string; originalUrl: string }) {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const args = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, args };
}

describe('LogExceptionFilter', () => {
  it('ghi 500 và trả body chung của Nest', () => {
    const calls: HttpFailure[] = [];
    const logs = { recordHttp: (row: HttpFailure) => void calls.push(row) } as unknown as LogsService;
    const filter = new LogExceptionFilter(logs);
    const { res, args } = host({ method: 'GET', originalUrl: '/api/orders' });
    filter.catch(new Error('boom'), args);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ status: 500, method: 'GET', path: '/api/orders', message: 'boom' });
    expect(calls[0].stack).toContain('boom');
  });

  it('giữ nguyên body 400', () => {
    const calls: HttpFailure[] = [];
    const logs = { recordHttp: (row: HttpFailure) => void calls.push(row) } as unknown as LogsService;
    const filter = new LogExceptionFilter(logs);
    const { res, args } = host({ method: 'POST', originalUrl: '/api/orders' });
    filter.catch(new BadRequestException(['Thiếu món', 'Sai số lượng']), args);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400, message: ['Thiếu món', 'Sai số lượng'] });
    expect(calls[0].message).toBe('Thiếu món; Sai số lượng');
    expect(calls[0].status).toBe(400);
  });
});
