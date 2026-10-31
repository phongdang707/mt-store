import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import multer from 'multer';
import { AdminGuard } from '../auth/admin.guard.js';
import { CustomerGuard } from '../customers/customer.guard.js';
import { StorageService } from '../storage/storage.service.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const image = FileInterceptor('file', {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

/** Multer báo "File too large"; client đang nhận diện đúng chuỗi này. */
@Catch(multer.MulterError, PayloadTooLargeException)
class UploadExceptionFilter implements ExceptionFilter {
  catch(err: Error, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const tooLarge =
      (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') ||
      err instanceof PayloadTooLargeException;
    res
      .status(400)
      .json({
        statusCode: 400,
        message: tooLarge ? 'File too large' : 'Không nhận được ảnh',
      });
  }
}

/** Ảnh khách (tìm hộ) và ảnh admin (sản phẩm). Cả hai trả `{ url }`. */
@Controller()
@UseFilters(UploadExceptionFilter)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('uploads')
  @UseGuards(CustomerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(image)
  customer(@UploadedFile() file?: Express.Multer.File) {
    return this.store(file, 'requests');
  }

  @Post('admin/uploads')
  @UseGuards(AdminGuard)
  @UseInterceptors(image)
  admin(@UploadedFile() file?: Express.Multer.File) {
    return this.store(file, 'products');
  }

  private async store(file: Express.Multer.File | undefined, folder: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Thiếu ảnh');
    if (!TYPES.has(file.mimetype) || !isImage(file.buffer))
      throw new BadRequestException('Chỉ nhận ảnh JPEG, PNG hoặc WebP');
    return { url: await this.storage.upload(file.buffer, folder) };
  }
}

function isImage(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8) return true;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return true;
  return (
    b.length > 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP'
  );
}
