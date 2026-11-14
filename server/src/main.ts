import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { LogsService } from './logs/logs.service.js';
import { PersistLogger } from './logs/persist-logger.js';
import { isApiPath, isSkippedPath } from './logs/redact.js';
import { openRequest, requestLog } from './logs/request-log.js';
import { LOCAL_UPLOAD_DIR } from './storage/storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });
  const logs = app.get(LogsService);
  app.useLogger(new PersistLogger(logs));
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const configured = config.get<string>('CORS_ORIGIN')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  const local =
    config.get('NODE_ENV') === 'production'
      ? []
      : ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5174', 'http://127.0.0.1:5174'];
  const origins = [...new Set([...configured, ...local])];
  app.enableCors({ origin: origins.length ? origins : true });
  app.set('trust proxy', 1);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl || req.url || '';
    const state = openRequest(isSkippedPath(path) || !isApiPath(path));
    res.on('finish', () => {
      void logs.recordFinished({
        status: res.statusCode,
        method: req.method || '',
        path: req.originalUrl || req.url || '',
        ms: Math.max(0, Date.now() - state.started),
        state,
      });
    });
    requestLog.run(state, () => next());
  });
  // Ảnh lưu tạm khi chưa cấu hình Cloudinary (dev).
  app.useStaticAssets(LOCAL_UPLOAD_DIR, { prefix: '/uploads', maxAge: '30d' });
  app.enableShutdownHooks();

  const port = Number(config.get('PORT')) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`Listening on 0.0.0.0:${port}`, 'Bootstrap');
}
await bootstrap();
