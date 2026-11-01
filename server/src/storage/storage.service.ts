import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
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
    const name = config.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    let key = config.get<string>('CLOUDINARY_API_KEY')?.trim();
    let secret = config.get<string>('CLOUDINARY_API_SECRET')?.trim();
    // API key của Cloudinary là chuỗi số. Nếu hai biến bị điền ngược, upload bị từ chối.
    if (key && secret && !/^\d+$/.test(key) && /^\d+$/.test(secret)) {
      [key, secret] = [secret, key];
      this.log.warn('CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET đang đảo, đã dùng đúng chiều');
    }
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
        const fail = (err?: { message?: string }) => {
          const raw = err?.message || '';
          const message = /api_key|api_secret|unauthorized|invalid signature/i.test(raw)
            ? 'Cloudinary từ chối khóa API. Kiểm tra CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.'
            : raw || 'Không lưu được ảnh';
          reject(new ServiceUnavailableException(message));
        };
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

  /** Xoá ảnh tìm hộ. URL lạ hoặc file đã mất thì bỏ qua. */
  async remove(url: string) {
    if (this.cloud && this.isOwnUrl(url)) {
      const id = cloudinaryPublicId(url);
      if (!id.startsWith('mt-store/requests/')) return;
      try {
        await cloudinary.uploader.destroy(id, { resource_type: 'image' });
      } catch (e) {
        this.log.warn(`Không xoá được ảnh: ${e instanceof Error ? e.message : 'lỗi không rõ'}`);
      }
      return;
    }
    const name = localRequestName(url);
    if (!name) return;
    try {
      await unlink(join(LOCAL_UPLOAD_DIR, 'requests', name));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.log.warn(`Không xoá được ảnh tạm ${name}`);
    }
  }
}

function cloudinaryPublicId(url: string) {
  const path = url.split('?')[0]?.split('/image/upload/')[1] ?? '';
  return path.replace(/^v\d+\//, '').replace(/\.[a-z0-9]+$/i, '');
}

/** Tên file trong `uploads/requests`, không có thư mục con. */
function localRequestName(url: string) {
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    return '';
  }
  const marker = '/uploads/requests/';
  const idx = path.indexOf(marker);
  if (idx < 0) return '';
  let name = '';
  try {
    name = decodeURIComponent(path.slice(idx + marker.length));
  } catch {
    return '';
  }
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return '';
  return name;
}

function sniffExt(b: Buffer) {
  if (b[0] === 0x89 && b[1] === 0x50) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49) return 'webp';
  if (b[0] === 0x3c) return 'svg';
  return 'jpg';
}
