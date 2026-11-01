import { randomBytes, randomInt } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { monthRange, norm } from '../common/json.js';
import type { CustomerDocument } from '../customers/customer.schema.js';
import { avatarUrl, CustomersService } from '../customers/customers.service.js';
import { ProductsService } from '../products/products.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { AddItemDto, AdminListQuery, CartItemDto, CreateOrderDto, CreateRequestDto, SendInvoiceDto, UpdateItemDto, UpdateOrderDto } from './order.dto.js';
import { EventsService } from './events.service.js';
import { invoiceStatus, Order, recompute, type OrderDocument, type OrderItem, type OrderKind } from './order.schema.js';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + 'đ';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
    private readonly customers: CustomersService,
    private readonly events: EventsService,
  ) {}

  /* ---------- Khách ---------- */

  async createOrder(c: CustomerDocument, dto: CreateOrderDto) {
    const items = await this.buildItems(dto.items, false);
    const { markets } = await this.settings.get();
    const closed = items.find((i) => markets.some((m) => m.key === i.country && !m.open));
    if (closed) throw new BadRequestException(`Hàng ${closed.country} đang tạm khoá đặt, bạn bỏ ${closed.name} khỏi giỏ nhé`);
    const zaloName = dto.name?.trim() || c.zaloName;
    const doc = await this.insert('order', c, {
      name: zaloName || c.name,
      avatar: avatarUrl(dto.avatar) || c.avatar,
      phone: dto.phone.trim(),
      addr: dto.addr.trim(),
      note: dto.note?.trim() ?? '',
      items,
    });
    await this.customers.remember(c._id, { name: doc.name, zaloName, avatar: doc.avatar, phone: doc.phone, addr: doc.addr });
    return doc;
  }

  async createRequest(c: CustomerDocument, dto: CreateRequestDto, allowedPhoto: (url: string) => boolean) {
    if (!dto.photos.every(allowedPhoto)) throw new BadRequestException('Ảnh không hợp lệ');
    const zaloName = dto.name?.trim() || c.zaloName;
    const doc = await this.insert('request', c, {
      name: zaloName || c.name,
      avatar: avatarUrl(dto.avatar) || c.avatar,
      phone: dto.phone?.trim() || c.phone,
      addr: dto.addr?.trim() || c.addr,
      note: dto.note?.trim() ?? '',
      product: dto.product.trim(),
      photos: dto.photos,
    });
    await this.customers.remember(c._id, { name: doc.name, zaloName, avatar: doc.avatar, phone: doc.phone, addr: doc.addr });
    return doc;
  }

  async mine(c: CustomerDocument) {
    const rows = await this.orders.find({ customer: c._id }).sort({ createdAt: -1 }).limit(30).exec();
    return rows.map((o) => this.forCustomer(o));
  }

  async markPaid(c: CustomerDocument, code: string) {
    const o = await this.byCode(code);
    if (!o.customer.equals(c._id)) throw new ForbiddenException();
    this.assertOpen(o);
    if (!o.paid) {
      o.paid = true;
      o.paidAt = new Date();
      await o.save();
      this.events.emit({ type: 'order', code, kind: o.kind, action: 'paid' });
    }
    return this.forCustomer(o);
  }

  /** Hoá đơn công khai qua link chia sẻ. */
  async publicInvoice(token: string) {
    const o = await this.orders.findOne({ token }).exec();
    if (!o) throw new NotFoundException('Không tìm thấy hoá đơn');
    const s = await this.settings.get();
    const { customer: _c, invoice: _i, token: _t, cancelReason: _r, ...order } = o.toJSON() as unknown as Record<string, unknown>;
    return { order, shop: { store: s.store, tagline: s.tagline, logo: s.logo, zalo: s.zalo, bank: s.bank, qr: s.qr } };
  }

  /* ---------- Quản lý ---------- */

  async adminList(q: AdminListQuery) {
    const f: Record<string, unknown> = {};
    if (q.kind) f.kind = q.kind;
    if (q.status) f.status = q.status;
    if (q.month) {
      const [a, b] = monthRange(q.month);
      f.createdAt = { $gte: a, $lt: b };
    }
    let list = await this.orders.find(f).sort({ createdAt: -1 }).limit(q.month ? 0 : 500).exec();
    const ids = list.map((o) => o.customer);
    const [flags, people] = await Promise.all([this.customers.blockedOf(ids), this.customers.profilesOf(ids)]);
    if (q.q) {
      const k = norm(q.q);
      list = list.filter((o) => {
        const person = people.get(String(o.customer));
        return norm([o.code, person?.name, o.name, o.phone, o.addr, o.product, o.note, ...o.items.map((i) => i.name)].join(' ')).includes(k);
      });
    }
    return list.map((o) => this.adminView(o, flags.get(String(o.customer)) ?? false, people.get(String(o.customer))));
  }

  /** Các tháng có đơn (mới nhất trước), luôn gồm tháng hiện tại. */
  async months() {
    const rows = await this.orders.aggregate<{ _id: string }>([
      { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m', timezone: '+07:00' } } } },
      { $sort: { _id: -1 } },
      { $limit: 24 },
    ]);
    const now = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7);
    return [...new Set([now, ...rows.map((r) => r._id)])].sort().reverse();
  }

  async badges() {
    const [pendingOrders, pendingRequests, confirmed, products] = await Promise.all([
      this.orders.countDocuments({ kind: 'order', status: 'pending' }),
      this.orders.countDocuments({ kind: 'request', status: 'pending' }),
      this.orders.find({ kind: 'order', status: 'confirmed' }).select('invoice').exec(),
      this.products.findAll().then((p) => p.length),
    ]);
    return { pendingOrders, pendingRequests, products, unsentInvoices: confirmed.filter((o) => invoiceStatus(o) !== 'sent').length };
  }

  async adminGet(code: string) {
    return this.viewOf(await this.byCode(code));
  }

  async setStatus(code: string, confirmed: boolean) {
    const o = await this.byCode(code);
    this.assertOpen(o);
    o.status = confirmed ? 'confirmed' : 'pending';
    o.confirmedAt = confirmed ? new Date() : undefined;
    return this.commit(o);
  }

  async cancel(code: string, reason?: string) {
    const o = await this.byCode(code);
    if (o.status === 'cancelled') throw new BadRequestException('Đơn này đã huỷ rồi');
    o.status = 'cancelled';
    o.cancelledAt = new Date();
    o.cancelReason = (reason ?? '').trim().slice(0, 300);
    return this.commit(o);
  }

  async restore(code: string) {
    const o = await this.byCode(code);
    if (o.status !== 'cancelled') throw new BadRequestException('Đơn này chưa bị huỷ');
    o.status = o.confirmedAt ? 'confirmed' : 'pending';
    o.cancelledAt = undefined;
    o.cancelReason = '';
    return this.commit(o);
  }

  async update(code: string, dto: UpdateOrderDto) {
    const o = await this.byCode(code);
    this.assertOpen(o);
    if (dto.quoteTotal !== undefined) {
      o.quoteTotal = dto.quoteTotal;
      o.quotedAt = new Date();
    }
    if (dto.shippingFee !== undefined) o.shippingFee = o.shipBase = dto.shippingFee;
    this.touchInvoice(o);
    return this.commit(o);
  }

  async addItem(code: string, dto: AddItemDto) {
    const o = await this.byCode(code);
    this.assertOpen(o);
    const [item] = await this.buildItems([dto], true);
    const same = o.items.find((i) => i.productId === item.productId && i.variant === item.variant);
    if (same) {
      this.touchInvoice(o, `Khách thêm ${label(same)} (${same.qty} → ${same.qty + item.qty})`);
      same.qty = Math.min(99, same.qty + item.qty);
    } else {
      item.addedLater = o.status === 'confirmed';
      o.items.push(item);
      this.touchInvoice(o, `Khách thêm ${label(item)}`);
    }
    return this.commit(o);
  }

  async updateItem(code: string, idx: number, dto: UpdateItemDto) {
    const o = await this.byCode(code);
    this.assertOpen(o);
    const it = o.items[idx];
    if (!it) throw new NotFoundException('Không có món này trong đơn');
    if (dto.price !== undefined && dto.price !== it.price) {
      it.price = dto.price;
      o.quotedAt = new Date();
      this.touchInvoice(o, `Cập nhật giá ${label(it)}: ${dto.price ? fmt(dto.price) : 'chờ báo giá'}`);
    }
    if (dto.qty !== undefined && dto.qty !== it.qty) {
      if (dto.qty === 0) return this.removeItem(code, idx, o);
      this.touchInvoice(o, `Khách ${dto.qty > it.qty ? 'thêm' : 'bớt'} ${label(it)} (${it.qty} → ${dto.qty})`);
      it.qty = dto.qty;
    }
    return this.commit(o);
  }

  async removeItem(code: string, idx: number, loaded?: OrderDocument) {
    const o = loaded ?? (await this.byCode(code));
    this.assertOpen(o);
    const it = o.items[idx];
    if (!it) throw new NotFoundException('Không có món này trong đơn');
    if (o.items.length === 1) throw new BadRequestException('Đơn phải còn ít nhất 1 món');
    o.items.splice(idx, 1);
    this.touchInvoice(o, `Khách bỏ ${label(it)}`);
    return this.commit(o);
  }

  async send(code: string, dto: SendInvoiceDto) {
    const o = await this.byCode(code);
    this.assertOpen(o);
    o.invoice.sends.push({ version: o.invoice.version, via: dto.via, at: new Date() });
    return this.commit(o);
  }

  /** Hoá đơn đã xác nhận cho customer support. Không kèm token hay đường link. */
  async supportList() {
    const [s, list] = await Promise.all([
      this.settings.get(),
      this.orders.find({ kind: 'order', status: 'confirmed' }).sort({ createdAt: -1 }).limit(500).exec(),
    ]);
    const people = await this.customers.peopleOf(list.map((o) => o.customer));
    return {
      store: s.store,
      logo: s.logo || '',
      qr: s.qr || '',
      bank: { bank: s.bank?.bank || '', bin: s.bank?.bin || '', acc: s.bank?.acc || '', name: s.bank?.name || '' },
      invoices: list.map((o) => {
        const person = people.get(String(o.customer));
        return {
          code: o.code,
          name: person?.name || o.name || '',
          avatar: person?.avatar || o.avatar || '',
          phone: o.phone || person?.phone || '',
          addr: o.addr || '',
          items: o.items.map((i) => ({
            name: i.name,
            variantName: i.variantName || '',
            img: i.img || '',
            qty: i.qty,
            price: i.price,
          })),
          subtotal: o.subtotal,
          shippingFee: o.shippingFee,
          shipBase: o.shipBase ?? null,
          total: o.total,
          createdAt: o.createdAt.toISOString(),
          invoiceStatus: invoiceStatus(o),
          zaloUserId: person?.zaloUserId || '',
        };
      }),
    };
  }

  /** Ghi đã gửi bản hoá đơn hiện tại qua Zalo. Không trả token. */
  async supportSend(code: string) {
    const o = await this.byCode(code);
    if (o.kind !== 'order' || o.status !== 'confirmed') throw new BadRequestException('Chỉ gửi hoá đơn của đơn đã xác nhận');
    o.invoice.sends.push({ version: o.invoice.version, via: 'zalo', at: new Date() });
    recompute(o);
    await o.save();
    this.events.emit({ type: 'order', code: o.code, kind: o.kind, action: 'updated' });
    return { code: o.code, invoiceStatus: invoiceStatus(o) };
  }

  /* ---------- Nội bộ ---------- */

  private async byCode(code: string) {
    const o = await this.orders.findOne({ code }).exec();
    if (!o) throw new NotFoundException(`Không tìm thấy đơn ${code}`);
    return o;
  }

  private assertOpen(o: OrderDocument) {
    if (o.status === 'cancelled') throw new BadRequestException('Đơn đã huỷ, hãy mở lại trước khi sửa');
  }

  /** Bản khách không kèm lý do huỷ. */
  private forCustomer(o: OrderDocument) {
    const row = o.toJSON() as unknown as Record<string, unknown>;
    delete row.cancelReason;
    return row;
  }

  private async insert(kind: OrderKind, c: CustomerDocument, data: Partial<Order>) {
    const s = await this.settings.get();
    const doc = new this.orders({
      ...data,
      kind,
      customer: c._id,
      avatar: avatarUrl(data.avatar) || c.avatar,
      shippingFee: s.shippingFee,
      shipBase: s.shippingFee,
      freeShipFrom: s.freeShipFrom,
    });
    recompute(doc);
    for (let tries = 0; ; tries++) {
      doc.code = kind === 'order' ? 'MT' + randomInt(100000, 1000000) : 'TH' + randomInt(1000, 10000);
      doc.token = randomBytes(12).toString('hex');
      try {
        await doc.save();
        break;
      } catch (e) {
        if ((e as { code?: number }).code !== 11000 || tries > 8) throw e;
      }
    }
    this.events.emit({ type: 'order', code: doc.code, kind, action: 'created' });
    return doc;
  }

  private async buildItems(cart: CartItemDto[], allowSoldout: boolean): Promise<OrderItem[]> {
    const found = new Map((await this.products.findMany([...new Set(cart.map((i) => i.productId))])).map((p) => [p._id, p]));
    const merged = new Map<string, OrderItem>();
    for (const i of cart) {
      const p = found.get(i.productId);
      if (!p) throw new BadRequestException(`Sản phẩm ${i.productId} không còn trên trang`);
      if (p.link) throw new BadRequestException(`${p.name} xem và đặt tại cửa hàng chính hãng`);
      if (p.soldout && !allowSoldout) throw new BadRequestException(`${p.name} đã hết hàng`);
      const hasV = p.variants.length > 0;
      if (hasV && (i.variant === undefined || !p.variants[i.variant])) {
        throw new BadRequestException(`Bạn chọn ${p.vlabel || 'tone'} cho ${p.name} nhé`);
      }
      const v = hasV ? p.variants[i.variant!] : null;
      const key = p._id + '::' + (v ? i.variant : '');
      const prev = merged.get(key);
      if (prev) prev.qty = Math.min(99, prev.qty + i.qty);
      else
        merged.set(key, {
          productId: p._id,
          variant: v ? i.variant! : null,
          variantName: v?.name ?? '',
          name: p.name,
          country: p.country || 'Nhật',
          img: v?.img || p.img,
          price: p.price,
          qty: i.qty,
          addedLater: false,
        });
    }
    return [...merged.values()];
  }

  /** Sửa hoá đơn đã tạo (đơn đã xác nhận) thì tăng version và ghi lịch sử. */
  private touchInvoice(o: OrderDocument, msg?: string) {
    if (o.status !== 'confirmed') return;
    o.invoice.version += 1;
    if (msg) o.invoice.log.push({ at: new Date(), msg });
  }

  private async commit(o: OrderDocument) {
    recompute(o);
    await o.save();
    this.events.emit({ type: 'order', code: o.code, kind: o.kind, action: 'updated' });
    return this.viewOf(o);
  }

  private async viewOf(o: OrderDocument) {
    const id = String(o.customer);
    const [blocked, people] = await Promise.all([this.customers.isBlocked(id), this.customers.profilesOf([id])]);
    return this.adminView(o, blocked, people.get(id));
  }

  /** Tên và ảnh lấy từ hồ sơ khách vừa sync, đơn chỉ giữ bản cũ khi hồ sơ còn trống. */
  private adminView(o: OrderDocument, blocked: boolean, person?: { name: string; avatar: string }) {
    const row = o.toJSON() as { name?: string; avatar?: string };
    return {
      ...row,
      name: person?.name || row.name || '',
      avatar: person?.avatar || row.avatar || '',
      customer: String(o.customer),
      blocked,
      invoiceStatus: o.status === 'confirmed' ? invoiceStatus(o) : null,
    };
  }
}

const label = (i: OrderItem) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
