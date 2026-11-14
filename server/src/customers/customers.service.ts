import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Customer, type CustomerRole } from './customer.schema.js';
import { messengerOpen } from './messenger.js';

export interface FacebookIdentity {
  id: string;
}

export interface FacebookToken {
  access: string;
  exp: Date;
}

/** Tên hiện trên shop: Facebook, rồi hồ sơ Zalo cũ, rồi tên đơn. */
export function socialName(c: { facebookName?: string; zaloName?: string; name?: string }) {
  return c.facebookName?.trim() || c.zaloName?.trim() || c.name?.trim() || '';
}

/** Ảnh là URL http(s). `//` và `http` được đổi thành https. Chuỗi khác bỏ. */
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

  byId(id: string) {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.customers.findById(id).exec();
  }

  /** Tạo khách theo facebookUserId nếu chưa có. */
  upsert(u: FacebookIdentity) {
    return this.customers
      .findOneAndUpdate({ facebookUserId: u.id }, { $setOnInsert: { facebookUserId: u.id } }, { new: true, upsert: true })
      .exec();
  }

  /** Tên hoặc ảnh Facebook đã lưu. */
  profileOf(customer: { facebookName?: string; zaloName?: string; avatar?: string }) {
    const name = customer.facebookName?.trim() || customer.zaloName?.trim() || '';
    const avatar = customer.avatar?.trim() || '';
    return { hasData: !!(name || avatar), name, avatar };
  }

  /** Ghi tên, ảnh, email. Trường trống không xoá dữ liệu đang có. */
  async syncProfile(id: unknown, info: { facebookName?: string; avatar?: string; email?: string }) {
    const facebookName = info.facebookName?.trim();
    await this.remember(id, { name: facebookName, facebookName, avatar: info.avatar, email: info.email });
    if (facebookName || avatarUrl(info.avatar)) {
      await this.customers.updateOne({ _id: id }, { $set: { lastSeenAt: new Date() } }).exec();
    }
    const customer = await this.customers.findById(id).select('facebookName zaloName name avatar').lean().exec();
    return this.profileOf(customer ?? {});
  }

  /** Tên và ảnh đang hiện trên trang quản lý. Ưu tiên tên Facebook. */
  async profilesOf(ids: unknown[]) {
    const unique = [...new Set(ids.map((id) => String(id ?? '')).filter((id) => Types.ObjectId.isValid(id)))];
    const map = new Map<string, { name: string; avatar: string }>();
    if (!unique.length) return map;
    const rows = await this.customers.find({ _id: { $in: unique } }).select('facebookName zaloName name avatar').lean().exec();
    for (const row of rows) {
      map.set(String(row._id), { name: socialName(row), avatar: row.avatar?.trim() || '' });
    }
    return map;
  }

  /** Lưu tên, ảnh, email, SĐT, địa chỉ. Trường trống không ghi đè lần trước. */
  remember(id: unknown, info: { name?: string; facebookName?: string; avatar?: string; email?: string; phone?: string; addr?: string }) {
    const set: Record<string, string> = {};
    for (const key of ['name', 'phone', 'addr'] as const) {
      const value = info[key]?.trim();
      if (value) set[key] = value;
    }
    const facebookName = info.facebookName?.trim();
    if (facebookName) set.facebookName = facebookName.slice(0, 120);
    const email = info.email?.trim().toLowerCase();
    if (email && email.includes('@') && email.length <= 200) set.email = email;
    const avatar = avatarUrl(info.avatar);
    if (avatar) set.avatar = avatar;
    if (!Object.keys(set).length) return Promise.resolve();
    return this.customers.updateOne({ _id: id }, { $set: set }).exec();
  }

  /** Bật hoặc tắt chặn, và/hoặc gán role customer support. */
  async updateAdmin(id: string, dto: { blocked?: boolean; role?: CustomerRole }) {
    if (dto.blocked === undefined && !dto.role) throw new BadRequestException('Chưa có gì để cập nhật');
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Không tìm thấy người dùng');
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (dto.blocked === true) {
      set.blocked = true;
      set.blockedAt = new Date();
    } else if (dto.blocked === false) {
      set.blocked = false;
      unset.blockedAt = 1;
    }
    if (dto.role) set.role = dto.role;
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const customer = await this.customers.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');
    return { id: String(customer._id), blocked: !!customer.blocked, role: customer.role === 'support' ? 'support' : 'customer' };
  }

  /** Tên, ảnh, SĐT và PSID để customer support nhắn Messenger. */
  async peopleOf(ids: unknown[]) {
    const unique = [...new Set(ids.map((id) => String(id ?? '')).filter((id) => Types.ObjectId.isValid(id)))];
    const map = new Map<string, { facebookUserId: string; messengerPsid: string; messengerReady: boolean; name: string; avatar: string; phone: string }>();
    if (!unique.length) return map;
    const rows = await this.customers
      .find({ _id: { $in: unique } })
      .select('facebookUserId facebookName zaloName name avatar phone messengerPsid messengerLastAt')
      .lean()
      .exec();
    for (const row of rows) {
      const messengerPsid = row.messengerPsid?.trim() || '';
      map.set(String(row._id), {
        facebookUserId: row.facebookUserId || '',
        messengerPsid,
        messengerReady: messengerOpen(messengerPsid, row.messengerLastAt),
        name: socialName(row),
        avatar: row.avatar?.trim() || '',
        phone: row.phone?.trim() || '',
      });
    }
    return map;
  }

  /** Gắn PSID khi khách mở m.me?ref=. `messaged` thì mở cửa sổ 24 giờ. */
  async bindMessenger(customerId: string, psid: string, messaged: boolean) {
    if (!Types.ObjectId.isValid(customerId) || !/^[\w-]{1,128}$/.test(psid)) return false;
    const set: Record<string, unknown> = { messengerPsid: psid };
    if (messaged) set.messengerLastAt = new Date();
    const res = await this.customers.updateOne({ _id: customerId }, { $set: set }).exec();
    return res.matchedCount > 0;
  }

  /** Khách nhắn Page khi đã có PSID, không kèm ref. */
  async touchMessenger(psid: string) {
    if (!/^[\w-]{1,128}$/.test(psid)) return;
    await this.customers.updateOne({ messengerPsid: psid }, { $set: { messengerLastAt: new Date() } }).exec();
  }

  async messengerOf(id: unknown) {
    const key = String(id ?? '');
    if (!Types.ObjectId.isValid(key)) return null;
    const row = await this.customers.findById(key).select('messengerPsid messengerLastAt').lean().exec();
    if (!row) return null;
    const psid = row.messengerPsid?.trim() || '';
    return { psid, ready: messengerOpen(psid, row.messengerLastAt) };
  }

  async isBlocked(id: unknown) {
    const key = String(id ?? '');
    if (!Types.ObjectId.isValid(key)) return false;
    const row = await this.customers.findById(key).select('blocked').lean().exec();
    return !!row?.blocked;
  }

  facebookSession(id: unknown) {
    const key = String(id ?? '');
    if (!Types.ObjectId.isValid(key)) return Promise.resolve(null);
    return this.customers.findById(key).select('+facebookAccessToken +facebookAccessExp').lean().exec();
  }

  saveFacebookToken(id: unknown, token: FacebookToken) {
    return this.customers.updateOne({ _id: id }, { $set: { facebookAccessToken: token.access, facebookAccessExp: token.exp } }).exec();
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
