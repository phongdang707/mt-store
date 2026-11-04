import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { LogExceptionFilter } from './log-exception.filter.js';
import { openRequest, requestLog } from './request-log.js';

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
  it('nhét 500 vào ngữ cảnh và trả body chung của Nest', () => {
    const filter = new LogExceptionFilter();
    const state = openRequest(false);
    const { res, args } = host({ method: 'GET', originalUrl: '/api/orders' });
    requestLog.run(state, () => filter.catch(new Error('boom'), args));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ statusCode: 500, message: 'Internal server error' });
    expect(state.failure).toMatchObject({ status: 500, message: 'boom' });
    expect(state.failure?.stack).toContain('boom');
  });

  it('giữ nguyên body 400', () => {
    const filter = new LogExceptionFilter();
    const state = openRequest(false);
    const { res, args } = host({ method: 'POST', originalUrl: '/api/orders' });
    requestLog.run(state, () => filter.catch(new BadRequestException(['Thiếu món', 'Sai số lượng']), args));
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400, message: ['Thiếu món', 'Sai số lượng'] });
    expect(state.failure?.message).toBe('Thiếu món; Sai số lượng');
    expect(state.failure?.status).toBe(400);
  });
});
