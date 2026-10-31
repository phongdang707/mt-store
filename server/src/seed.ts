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
  } else {
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
  }
} finally {
  await app.close();
}

/** Ảnh đang trỏ `http://localhost/.../uploads/...` thì đọc file local và đẩy lên Cloudinary. */
function localUpload(url: string): { file: string; folder: string; publicId: string } | null {
  let pathname: string;
  try {
    const u = new URL(url);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return null;
    pathname = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  if (!pathname.startsWith('/uploads/')) return null;
  const rel = pathname.slice('/uploads/'.length);
  const slash = rel.indexOf('/');
  if (slash <= 0 || rel.includes('..')) return null;
  const folder = rel.slice(0, slash);
  const base = rel.slice(slash + 1);
  if (!base) return null;
  return { file: join(LOCAL_UPLOAD_DIR, folder, base), folder, publicId: base.replace(/\.[^.]+$/, '') };
}

async function pool<T>(n: number, items: T[], fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function rehostLocal(storage: StorageService, products: Model<Product>, settings: Model<Settings>) {
  if (!storage.usesCloud) throw new Error('Cần CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET để đẩy ảnh.');
  const docs = await products.find().select('img variants').lean().exec();
  const shop = await settings.findById('main').select('qr').lean().exec();
  const files = new Map<string, { file: string; folder: string; publicId: string }>();
  const add = (url: string) => {
    const loc = url ? localUpload(url) : null;
    if (loc) files.set(loc.file, loc);
  };
  for (const p of docs) {
    add(p.img);
    for (const v of p.variants ?? []) add(v.img);
  }
  if (shop?.qr) add(shop.qr);

  const uploaded = new Map<string, string>();
  const failures: string[] = [];
  await pool(4, [...files.values()], async (loc) => {
    try {
      uploaded.set(loc.file, await storage.upload(await readFile(loc.file), loc.folder, loc.publicId));
      process.stdout.write(`\r${uploaded.size}/${files.size} ảnh…`);
    } catch (e) {
      failures.push(`${loc.file}: ${(e as Error).message}`);
    }
  });
  const next = (url: string) => {
    const loc = url ? localUpload(url) : null;
    return (loc && uploaded.get(loc.file)) || url;
  };

  let changed = 0;
  for (const p of docs) {
    const img = next(p.img);
    let variantsChanged = false;
    const variants = (p.variants ?? []).map((v) => {
      const imgUrl = next(v.img);
      if (imgUrl !== v.img) variantsChanged = true;
      return { name: v.name, img: imgUrl };
    });
    if (img !== p.img || variantsChanged) {
      await products.updateOne({ _id: p._id }, { $set: variantsChanged ? { img, variants } : { img } });
      changed++;
    }
  }
  let qrChanged = false;
  if (shop?.qr) {
    const qr = next(shop.qr);
    if (qr !== shop.qr) {
      await settings.updateOne({ _id: 'main' }, { $set: { qr } });
      qrChanged = true;
    }
  }
  console.log(`\nĐã đẩy ${uploaded.size} ảnh. ${changed} sản phẩm cập nhật${qrChanged ? ', QR shop đã đổi' : ''}.`);
  if (failures.length) {
    console.error(failures.join('\n'));
    throw new Error(`${failures.length} ảnh chưa đẩy được`);
  }
}
