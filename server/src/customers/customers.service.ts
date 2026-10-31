import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Customer } from './customer.schema.js';
import type { ZaloUser } from './zalo.service.js';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<Customer>) {}

  /** Tạo hoặc cập nhật tên/ảnh Zalo của khách. */
  upsert(u: ZaloUser) {
    const set: Partial<Customer> = {};
    if (u.name) set.name = u.name;
    if (u.avatar) set.avatar = u.avatar;
    return this.customers
      .findOneAndUpdate({ zaloId: u.id }, { $set: set, $setOnInsert: { zaloId: u.id } }, { new: true, upsert: true })
      .exec();
  }

  /** Lưu SĐT/địa chỉ khách nhập lần gần nhất. */
  remember(id: unknown, info: { phone?: string; addr?: string }) {
    return this.customers.updateOne({ _id: id }, { $set: info }).exec();
  }
}
