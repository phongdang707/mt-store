import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { LogsService } from './logs/logs.service.js';
import { PersistLogger } from './logs/persist-logger.js';
import { isSkippedPath } from './logs/redact.js';
import { requestLog } from './logs/request-log.js';
import { LOCAL_UPLOAD_DIR } from './storage/storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(new PersistLogger(app.get(LogsService)));
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const origins = config.get<string>('CORS_ORIGIN')?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true });
  app.set('trust proxy', 1);
  app.use((req: Request, _res: Response, next: NextFunction) => {
    requestLog.run({ skip: isSkippedPath(req.originalUrl || req.url) }, () => next());
  });
  // Ảnh lưu tạm khi chưa cấu hình Cloudinary (dev).
  app.useStaticAssets(LOCAL_UPLOAD_DIR, { prefix: '/uploads', maxAge: '30d' });
  app.enableShutdownHooks();

  const port = Number(config.get('PORT')) || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`Listening on 0.0.0.0:${port}`, 'Bootstrap');
}
await bootstrap();
