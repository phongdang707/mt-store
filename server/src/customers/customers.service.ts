import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Customer } from './customer.schema.js';
import type { ZaloUser } from './zalo.service.js';

/** Ảnh Zalo là URL http(s). `//` và `http` được đổi thành https. Chuỗi khác bỏ. */
export function avatarUrl(v: string | undefined) {
  let s = v?.trim() ?? '';
  if (s.length > 2000) s = s.slice(0, 2000);
  if (s.startsWith('//')) s = 'https:' + s;
  if (/^http:\/\//i.test(s)) s = 'https://' + s.slice('http://'.length);
  return /^https:\/\//i.test(s) ? s : '';
}

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<Customer>) {}

  /** Tạo khách theo zaloUserId nếu chưa có. Tên Zalo ghi ở `zaloName` khi mở app. */
  upsert(u: ZaloUser) {
    return this.customers
      .findOneAndUpdate({ zaloUserId: u.id }, { $setOnInsert: { zaloUserId: u.id } }, { new: true, upsert: true })
      .exec();
  }

  /** Tên hoặc ảnh Zalo đã lưu thì không xin quyền nữa. */
  profileOf(customer: { zaloName?: string; avatar?: string }) {
    const name = customer.zaloName?.trim() || '';
    const avatar = customer.avatar?.trim() || '';
    return { hasData: !!(name || avatar), name, avatar };
  }

  /** Ghi tên và ảnh mới. Trường trống không xoá dữ liệu đang có. */
  async syncProfile(id: unknown, info: { zaloName?: string; avatar?: string }) {
    const zaloName = info.zaloName?.trim();
    await this.remember(id, { name: zaloName, zaloName, avatar: info.avatar });
    if (zaloName || avatarUrl(info.avatar)) {
      await this.customers.updateOne({ _id: id }, { $set: { lastSeenAt: new Date() } }).exec();
    }
    const customer = await this.customers.findById(id).select('zaloName name avatar').lean().exec();
    return this.profileOf(customer ?? {});
  }

  /** Tên và ảnh đang hiện trên trang quản lý. Ưu tiên tên Zalo. */
  async profilesOf(ids: unknown[]) {
    const unique = [...new Set(ids.map((id) => String(id ?? '')).filter((id) => Types.ObjectId.isValid(id)))];
    const map = new Map<string, { name: string; avatar: string }>();
    if (!unique.length) return map;
    const rows = await this.customers.find({ _id: { $in: unique } }).select('zaloName name avatar').lean().exec();
    for (const row of rows) {
      map.set(String(row._id), { name: row.zaloName?.trim() || row.name?.trim() || '', avatar: row.avatar?.trim() || '' });
    }
    return map;
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
