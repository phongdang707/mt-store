import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard.js';
import { CustomerGuard } from '../customers/customer.guard.js';
import { StorageService } from '../storage/storage.service.js';

const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Ảnh khách (tìm hộ) và ảnh admin (sản phẩm). Cả hai trả `{ url }`. */
@Controller()
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('uploads')
  @UseGuards(CustomerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  customer(@UploadedFile() file?: Express.Multer.File) {
    return this.store(file, 'requests');
  }

  @Post('admin/uploads')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  admin(@UploadedFile() file?: Express.Multer.File) {
    return this.store(file, 'products');
  }

  private async store(file: Express.Multer.File | undefined, folder: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Thiếu ảnh');
    if (!TYPES.has(file.mimetype) || !isImage(file.buffer)) throw new BadRequestException('Chỉ nhận ảnh JPG, PNG hoặc WebP');
    return { url: await this.storage.upload(file.buffer, folder) };
  }
}

function isImage(b: Buffer) {
  if (b[0] === 0xff && b[1] === 0xd8) return true;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
  return b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
}
