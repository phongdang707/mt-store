import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const LOCAL_UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * Lưu ảnh lên Cloudinary. Chưa cấu hình Cloudinary và không chạy production
 * thì lưu vào `uploads/` (phục vụ ở `/uploads`) để dev được.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly cloud: boolean;

  constructor(private readonly config: ConfigService) {
    const name = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = config.get<string>('CLOUDINARY_API_KEY');
    const secret = config.get<string>('CLOUDINARY_API_SECRET');
    this.cloud = !!(name && key && secret);
    if (this.cloud) cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret, secure: true });
    else this.log.warn('Chưa cấu hình Cloudinary, ảnh lưu tạm vào ./uploads');
  }

  get usesCloud() {
    return this.cloud;
  }

  /** URL do chính server này lưu (chống khách gửi link ảnh bên ngoài). */
  isOwnUrl(url: string) {
    const name = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    if (this.cloud) return url.startsWith(`https://res.cloudinary.com/${name}/image/upload/`);
    return url.startsWith(`${this.localBase}/uploads/`);
  }

  private get localBase() {
    return this.config.get<string>('PUBLIC_URL') ?? `http://localhost:${this.config.get('PORT') ?? 3000}`;
  }

  async upload(data: Buffer, folder: string, publicId?: string): Promise<string> {
    if (this.cloud) {
      // v2: upload_stream(options, (err, result)). Bản v1 nội bộ nhận (callback, options);
      // adapter của v2 đã đảo và đổi result.error thành tham số err. Không đảo thêm ở đây.
      const options: { folder: string; overwrite: boolean; resource_type: 'image'; public_id?: string } = {
        folder: `mt-store/${folder}`,
        overwrite: true,
        resource_type: 'image',
      };
      if (publicId) options.public_id = publicId;
      const res = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const fail = (err?: { message?: string }) => reject(new ServiceUnavailableException(err?.message || 'Không lưu được ảnh'));
        try {
          const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err || !result?.secure_url) fail(err);
            else resolve(result);
          });
          stream.on('error', (err: Error) => fail(err));
          stream.end(data);
        } catch (e) {
          fail(e instanceof Error ? e : undefined);
        }
      });
      return res.secure_url;
    }
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException('Chưa cấu hình nơi lưu ảnh');
    }
    const dir = join(LOCAL_UPLOAD_DIR, folder);
    await mkdir(dir, { recursive: true });
    const name = `${publicId ?? randomUUID()}.${sniffExt(data)}`;
    await writeFile(join(dir, name), data);
    return `${this.localBase}/uploads/${folder}/${name}`;
  }
}

function sniffExt(b: Buffer) {
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49) return 'webp';
  if (b[0] === 0x3c) return 'svg';
  return 'jpg';
}
