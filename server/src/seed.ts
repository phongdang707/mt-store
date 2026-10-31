/**
 * Nạp catalog tách từ app bán hàng (seed/catalog.json + seed/images) vào MongoDB.
 *   npm run seed            thêm sản phẩm chưa có, giữ nguyên món chủ shop đã sửa
 *   npm run seed -- --reset xoá hết sản phẩm rồi nạp lại (tải lại ảnh)
 *   npm run seed -- --rehost  đẩy ảnh localhost trong DB lên Cloudinary, không đụng giá
 * Ảnh lên Cloudinary nếu đã cấu hình, không thì vào ./uploads.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Product } from './products/product.schema.js';
import { Settings } from './settings/settings.schema.js';
import { LOCAL_UPLOAD_DIR, StorageService } from './storage/storage.service.js';

interface Seed {
  store: string;
  subtitle: string;
  cats: string[];
  countries: string[];
  bank: { bank: string; bin: string; acc: string; name: string };
  qr?: string;
  products: (Omit<Product, '_id' | 'sort'> & { id: string; variants?: { name: string; img: string }[] })[];
}

const dir = join(process.cwd(), 'seed');
const reset = process.argv.includes('--reset');
const rehost = process.argv.includes('--rehost');

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
try {
  const storage = app.get(StorageService);
  const products = app.get<Model<Product>>(getModelToken(Product.name));
  const settings = app.get<Model<Settings>>(getModelToken(Settings.name));
  if (rehost) {
    if (reset) throw new Error('--rehost không đi cùng --reset');
    await rehostLocal(storage, products, settings);
    return;
  }
  const data = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8')) as Seed;

  const up = async (file: string, folder = 'products') =>
    file ? storage.upload(await readFile(join(dir, folder === 'shop' ? '' : 'images', file)), folder, file.replace(/\.\w+$/, '')) : '';

  const s = await settings.findById('main').exec();
  if (!s || reset) {
    await settings.updateOne(
      { _id: 'main' },
      {
        $set: {
          store: data.store,
          subtitle: data.subtitle,
          cats: data.cats,
          countries: data.countries,
          bank: data.bank,
          qr: data.qr ? await up(data.qr, 'shop') : '',
        },
      },
      { upsert: true },
    );
  }

  if (reset) await products.deleteMany({});
  const have = new Set((await products.find().select('_id').lean().exec()).map((p) => p._id));
  let added = 0;
  for (const [i, { id, ...p }] of data.products.entries()) {
    if (have.has(id)) continue;
    const variants = await Promise.all((p.variants ?? []).map(async (v) => ({ name: v.name, img: await up(v.img) })));
    await products.create({ ...p, _id: id, img: await up(p.img), variants, sort: i });
    added++;
    process.stdout.write(`\r${added} sản phẩm mới…`);
  }
  console.log(`\nXong: ${added} sản phẩm mới, ${have.size} giữ nguyên. Ảnh: ${storage.usesCloud ? 'Cloudinary' : './uploads'}`);
} finally {
  await app.close();
}
