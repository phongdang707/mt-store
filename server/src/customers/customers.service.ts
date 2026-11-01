import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Customer } from './customer.schema.js';
import type { ZaloUser } from './zalo.service.js';

/** Ảnh Zalo là URL https. `//` được đổi thành https. Chuỗi khác bỏ. */
export function avatarUrl(v: string | undefined) {
  let s = v?.trim() ?? '';
  if (s.length > 2000) s = s.slice(0, 2000);
  if (s.startsWith('//')) s = 'https:' + s;
  return /^https:\/\//i.test(s) ? s : '';
}

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<Customer>) {}

  /** Tạo khách theo Zalo user ID nếu chưa có. Tên Zalo ghi ở `zaloName` khi mở app. */
  upsert(u: ZaloUser) {
    return this.customers
      .findOneAndUpdate({ zaloId: u.id }, { $setOnInsert: { zaloId: u.id } }, { new: true, upsert: true })
      .exec();
  }

  /** Lưu tên Zalo, ảnh, SĐT, địa chỉ khách vừa gửi. Trường trống không ghi đè lần trước. */
  remember(id: unknown, info: { name?: string; zaloName?: string; avatar?: string; phone?: string; addr?: string }) {
    const set: Record<string, string> = {};
    for (const key of ['name', 'phone', 'addr'] as const) {
      const value = info[key]?.trim();
      if (value) set[key] = value;
    }
    const zaloName = info.zaloName?.trim();
    if (zaloName) set.zaloName = zaloName.slice(0, 120);
    const avatar = avatarUrl(info.avatar);
    if (avatar) set.avatar = avatar;
    if (!Object.keys(set).length) return Promise.resolve();
    return this.customers.updateOne({ _id: id }, { $set: set }).exec();
  }

  /** Bật hoặc tắt chặn. `blockedAt` chỉ giữ lúc đang chặn. */
  async setBlocked(id: string, on: boolean) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Không tìm thấy người dùng');
    const customer = await this.customers
      .findByIdAndUpdate(
        id,
        on ? { $set: { blocked: true, blockedAt: new Date() } } : { $set: { blocked: false }, $unset: { blockedAt: 1 } },
        { new: true },
      )
      .exec();
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');
    return { id: String(customer._id), blocked: customer.blocked };
  }

  async isBlocked(id: unknown) {
    const key = String(id ?? '');
    if (!Types.ObjectId.isValid(key)) return false;
    const row = await this.customers.findById(key).select('blocked').lean().exec();
    return !!row?.blocked;
  }

  /** Id khách → đang bị chặn. Id lạ bỏ qua. */
  async blockedOf(ids: unknown[]) {
    const unique = [...new Set(ids.map((id) => String(id ?? '')).filter((id) => Types.ObjectId.isValid(id)))];
    const map = new Map<string, boolean>();
    if (!unique.length) return map;
    const rows = await this.customers.find({ _id: { $in: unique } }).select('blocked').lean().exec();
    for (const row of rows) map.set(String(row._id), !!row.blocked);
    return map;
  }
}
