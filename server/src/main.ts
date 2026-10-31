import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { LOCAL_UPLOAD_DIR } from './storage/storage.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const origins = config.get<string>('CORS_ORIGIN')?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins?.length ? origins : true });
  app.set('trust proxy', 1);
  // Ảnh lưu tạm khi chưa cấu hình Cloudinary (dev).
  app.useStaticAssets(LOCAL_UPLOAD_DIR, { prefix: '/uploads', maxAge: '30d' });
  app.enableShutdownHooks();

  await app.listen(config.get<number>('PORT') ?? 3000);
}
await bootstrap();
