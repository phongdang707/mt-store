import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Customer } from './customer.schema.js';
import type { ZaloUser } from './zalo.service.js';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<Customer>) {}

  /** Tạo khách theo Zalo user ID nếu chưa có. Tên và ảnh không lấy từ Zalo. */
  upsert(u: ZaloUser) {
    return this.customers
      .findOneAndUpdate({ zaloId: u.id }, { $setOnInsert: { zaloId: u.id } }, { new: true, upsert: true })
      .exec();
  }

  /** Lưu tên, SĐT, địa chỉ khách vừa gửi. Trường trống không ghi đè lần trước. */
  remember(id: unknown, info: { name?: string; phone?: string; addr?: string }) {
    const set: Record<string, string> = {};
    for (const key of ['name', 'phone', 'addr'] as const) {
      const value = info[key]?.trim();
      if (value) set[key] = value;
    }
    if (!Object.keys(set).length) return Promise.resolve();
    return this.customers.updateOne({ _id: id }, { $set: set }).exec();
  }
}
