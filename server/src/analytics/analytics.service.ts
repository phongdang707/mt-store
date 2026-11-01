import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Customer, type CustomerDocument } from '../customers/customer.schema.js';
import { Order } from '../orders/order.schema.js';
import { Product } from '../products/product.schema.js';
import type { DaysQuery, EventsDto, VisitDto } from './analytics.dto.js';
import { ProductEvent, Visit, type EventType } from './analytics.schema.js';

const GAP_MS = 30 * 60_000;
const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;

const text = (v: string | undefined, max: number) => {
  const s = v?.trim();
  return s ? s.slice(0, max) : '';
};

function avatarUrl(v: string | undefined) {
  let s = text(v, 2000);
  if (s.startsWith('//')) s = 'https:' + s;
  return /^https:\/\//i.test(s) ? s : '';
}

/** ios / android / web. Chuỗi lạ giữ lại, cắt ngắn. */
function platformOf(v: string | undefined) {
  const s = (v || '').trim().toLowerCase();
  if (s === 'iphone' || s === 'ipad' || s === 'ios') return 'ios';
  if (s === 'android') return 'android';
  if (!s || s === 'web') return s ? 'web' : '';
  return s.slice(0, 32);
}

/** Đầu ngày theo giờ Việt Nam, lùi `days - 1` ngày, tới lúc gọi. */
export function period(days: number) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d, -7) - (days - 1) * DAY);
  const to = new Date();
  const labels = Array.from({ length: days }, (_, i) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(from.getTime() + i * DAY + 3_600_000)),
  );
  return { from, to, labels };
}

const rate = (n: number, d: number) => (d ? n / d : 0);

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<Customer>,
    @InjectModel(Visit.name) private readonly visits: Model<Visit>,
    @InjectModel(ProductEvent.name) private readonly events: Model<ProductEvent>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
  ) {}

  /** Ghi hồ sơ, máy, và cộng giây vào phiên đang mở. */
  async visit(customer: CustomerDocument, dto: VisitDto) {
    const now = new Date();
    const seconds = dto.seconds ?? 0;
    const device = {
      platform: platformOf(dto.platform),
      os: text(dto.os, 64),
      model: text(dto.model, 64),
      zaloVersion: text(dto.zaloVersion, 32),
    };
    const set: Record<string, string | Date> = { lastSeenAt: now };
    const name = text(dto.name, 120);
    const language = text(dto.language, 16);
    const avatar = avatarUrl(dto.avatar);
    if (name) set.name = name;
    if (language) set.language = language;
    if (avatar) set.avatar = avatar;
    for (const key of ['platform', 'os', 'model', 'zaloVersion'] as const) {
      if (device[key]) set[key] = device[key];
    }

    const id = customer._id;
    const open = await this.visits
      .findOne({ customer: id, lastBeatAt: { $gte: new Date(now.getTime() - GAP_MS) } })
      .sort({ lastBeatAt: -1 })
      .exec();
    const deviceSet: Record<string, string> = {};
    for (const key of ['platform', 'os', 'model', 'zaloVersion'] as const) {
      if (device[key]) deviceSet[key] = device[key];
    }
    if (open) {
      await this.visits.updateOne({ _id: open._id }, { $inc: { durationSec: seconds }, $set: { lastBeatAt: now, ...deviceSet } }).exec();
      await this.customers.updateOne({ _id: id }, { $set: set }).exec();
      return;
    }
    await this.visits.create({ customer: id, startedAt: now, lastBeatAt: now, durationSec: seconds, ...device });
    await this.customers.updateOne({ _id: id }, { $set: set, $inc: { visitCount: 1 } }).exec();
  }

  /** Lượt xem, mở chi tiết, thêm giỏ. Trùng trong cùng một request chỉ ghi một lần. */
  async track(customerId: unknown, dto: EventsDto) {
    const seen = new Set<string>();
    const at = new Date();
    const docs = [];
    for (const e of dto.events) {
      const key = e.type + ':' + e.productId;
      if (seen.has(key)) continue;
      seen.add(key);
      docs.push({ customer: customerId, productId: e.productId, type: e.type, at });
    }
    if (docs.length) await this.events.insertMany(docs);
  }

  async report(q: DaysQuery) {
    const days = q.days ?? 30;
    const { from, to, labels } = period(days);
    const span = { $gte: from, $lte: to };

    const [visitRoll, eventRoll, newUsers, orderRoll, platforms, dailyVisits, dailyViews, productRoll, orderProducts, userRoll] = await Promise.all([
      this.visits.aggregate<{ visits: number; duration: number; users: Types.ObjectId[] }>([
        { $match: { startedAt: span } },
        { $group: { _id: null, visits: { $sum: 1 }, duration: { $sum: '$durationSec' }, users: { $addToSet: '$customer' } } },
      ]),
      this.events.aggregate<{ _id: EventType; n: number; users: Types.ObjectId[] }>([
        { $match: { at: span } },
        { $group: { _id: '$type', n: { $sum: 1 }, users: { $addToSet: '$customer' } } },
      ]),
      this.customers.countDocuments({ createdAt: span }).exec(),
      this.orders.aggregate<{ n: number; users: Types.ObjectId[] }>([
        { $match: { kind: 'order', createdAt: span } },
        { $group: { _id: null, n: { $sum: 1 }, users: { $addToSet: '$customer' } } },
      ]),
      this.visits.aggregate<{ _id: string; users: number }>([
        { $match: { startedAt: span } },
        { $sort: { startedAt: -1 } },
        { $group: { _id: '$customer', platform: { $first: '$platform' } } },
        { $group: { _id: '$platform', users: { $sum: 1 } } },
      ]),
      this.visits.aggregate<{ _id: string; visits: number; duration: number }>([
        { $match: { startedAt: span } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: TZ } }, visits: { $sum: 1 }, duration: { $sum: '$durationSec' } } },
      ]),
      this.events.aggregate<{ _id: string; views: number }>([
        { $match: { at: span, type: 'view' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: TZ } }, views: { $sum: 1 } } },
      ]),
      this.events.aggregate<{ _id: { productId: string; type: EventType }; n: number; users: Types.ObjectId[] }>([
        { $match: { at: span } },
        { $group: { _id: { productId: '$productId', type: '$type' }, n: { $sum: 1 }, users: { $addToSet: '$customer' } } },
      ]),
      this.orders.aggregate<{ _id: string; orders: number }>([
        { $match: { kind: 'order', createdAt: span } },
        { $unwind: '$items' },
        { $group: { _id: { order: '$_id', productId: '$items.productId' } } },
        { $group: { _id: '$_id.productId', orders: { $sum: 1 } } },
      ]),
      this.visits.aggregate<{ _id: Types.ObjectId; visits: number; duration: number; lastSeen: Date }>([
        { $match: { startedAt: span } },
        { $group: { _id: '$customer', visits: { $sum: 1 }, duration: { $sum: '$durationSec' }, lastSeen: { $max: '$lastBeatAt' } } },
        { $sort: { lastSeen: -1 } },
        { $limit: 200 },
      ]),
    ]);

    const byType = (t: EventType) => eventRoll.find((r) => r._id === t);
    const views = byType('view');
    const opens = byType('open');
    const carts = byType('cart');
    const active = visitRoll[0]?.users.length ?? 0;
    const viewers = views?.users.length ?? 0;
    const cartUsers = carts?.users.length ?? 0;
    const orderUsers = orderRoll[0]?.users.length ?? 0;
    const duration = visitRoll[0]?.duration ?? 0;
    const visitCount = visitRoll[0]?.visits ?? 0;

    const names = await this.productNames([
      ...productRoll.map((r) => r._id.productId),
      ...orderProducts.map((r) => r._id),
    ]);
    const ordersByProduct = new Map(orderProducts.map((r) => [r._id, r.orders]));
    const productMap = new Map<string, { views: number; viewers: number; opens: number; carts: number }>();
    for (const row of productRoll) {
      const slot = productMap.get(row._id.productId) ?? { views: 0, viewers: 0, opens: 0, carts: 0 };
      if (row._id.type === 'view') {
        slot.views = row.n;
        slot.viewers = row.users.length;
      } else if (row._id.type === 'open') slot.opens = row.n;
      else slot.carts = row.n;
      productMap.set(row._id.productId, slot);
    }
    const productRows = [...productMap.entries()]
      .map(([id, n]) => ({ id, name: names.get(id)?.name || id, img: names.get(id)?.img || '', ...n, orders: ordersByProduct.get(id) ?? 0 }))
      .sort((a, b) => b.views - a.views || b.opens - a.opens || b.carts - a.carts)
      .slice(0, 30);

    const userIds = userRoll.map((r) => r._id);
    const [people, blockedAway, previews] = await Promise.all([
      this.customers.find({ _id: { $in: userIds } }).exec(),
      this.customers.find(userIds.length ? { blocked: true, _id: { $nin: userIds } } : { blocked: true }).exec(),
      this.events.aggregate<{ _id: Types.ObjectId; products: { productId: string; views: number }[] }>([
        { $match: { at: span, type: 'view', customer: { $in: userIds } } },
        { $group: { _id: { customer: '$customer', productId: '$productId' }, views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $group: { _id: '$_id.customer', products: { $push: { productId: '$_id.productId', views: '$views' } } } },
        { $project: { products: { $slice: ['$products', 3] } } },
      ]),
    ]);
    const person = new Map(people.map((c) => [String(c._id), c]));
    const preview = new Map(previews.map((r) => [String(r._id), r.products]));
    const visitByDay = new Map(dailyVisits.map((r) => [r._id, r]));
    const viewByDay = new Map(dailyViews.map((r) => [r._id, r.views]));
    const order = ['ios', 'android', 'web'];
    const rank = (p: string) => {
      const i = order.indexOf(p);
      return i < 0 ? order.length : i;
    };

    return {
      days,
      summary: {
        activeUsers: active,
        newUsers,
        visits: visitCount,
        durationSec: duration,
        avgSessionSec: visitCount ? Math.round(duration / visitCount) : 0,
        avgUserSec: active ? Math.round(duration / active) : 0,
        views: views?.n ?? 0,
        opens: opens?.n ?? 0,
        carts: carts?.n ?? 0,
        orders: orderRoll[0]?.n ?? 0,
        viewers,
        cartUsers,
        orderUsers,
      },
      rates: { view: rate(viewers, active), cart: rate(cartUsers, viewers), order: rate(orderUsers, active) },
      platforms: platforms
        .map((p) => ({ platform: p._id || 'web', users: p.users }))
        .sort((a, b) => rank(a.platform) - rank(b.platform) || b.users - a.users),
      daily: labels.map((date) => ({
        date,
        visits: visitByDay.get(date)?.visits ?? 0,
        durationSec: visitByDay.get(date)?.duration ?? 0,
        views: viewByDay.get(date) ?? 0,
      })),
      products: productRows,
      users: [
        ...userRoll.map((r) => {
          const c = person.get(String(r._id));
          const seen = preview.get(String(r._id)) ?? [];
          return {
            id: String(r._id),
            name: c?.name || '',
            avatar: c?.avatar || '',
            phone: c?.phone || '',
            platform: c?.platform || '',
            model: c?.model || '',
            lastSeenAt: r.lastSeen?.toISOString() ?? null,
            visits: r.visits,
            durationSec: r.duration,
            blocked: !!c?.blocked,
            products: seen.map((p) => ({ id: p.productId, name: names.get(p.productId)?.name || p.productId, views: p.views })),
          };
        }),
        ...blockedAway.map((c) => ({
          id: String(c._id),
          name: c.name || '',
          avatar: c.avatar || '',
          phone: c.phone || '',
          platform: c.platform || '',
          model: c.model || '',
          lastSeenAt: c.lastSeenAt?.toISOString() ?? null,
          visits: 0,
          durationSec: 0,
          blocked: true,
          products: [],
        })),
      ],
    };
  }

  async user(id: string, q: DaysQuery) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Không tìm thấy người dùng');
    const customer = await this.customers.findById(id).exec();
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');
    const days = q.days ?? 30;
    const { from, to } = period(days);
    const span = { $gte: from, $lte: to };
    const cid = customer._id;

    const [visits, productRoll, orders] = await Promise.all([
      this.visits.find({ customer: cid, startedAt: span }).sort({ startedAt: -1 }).limit(50).exec(),
      this.events.aggregate<{ _id: { productId: string; type: EventType }; n: number }>([
        { $match: { customer: cid, at: span } },
        { $group: { _id: { productId: '$productId', type: '$type' }, n: { $sum: 1 } } },
      ]),
      this.orders.countDocuments({ customer: cid, kind: 'order', createdAt: span }).exec(),
    ]);
    const names = await this.productNames(productRoll.map((r) => r._id.productId));
    const byProduct = new Map<string, { views: number; opens: number; carts: number }>();
    for (const row of productRoll) {
      const slot = byProduct.get(row._id.productId) ?? { views: 0, opens: 0, carts: 0 };
      if (row._id.type === 'view') slot.views = row.n;
      else if (row._id.type === 'open') slot.opens = row.n;
      else slot.carts = row.n;
      byProduct.set(row._id.productId, slot);
    }

    return {
      days,
      orders,
      user: {
        id: String(customer._id),
        name: customer.name,
        avatar: customer.avatar,
        phone: customer.phone,
        platform: customer.platform,
        os: customer.os,
        model: customer.model,
        zaloVersion: customer.zaloVersion,
        language: customer.language,
        lastSeenAt: customer.lastSeenAt?.toISOString() ?? null,
        visitCount: customer.visitCount || 0,
        createdAt: customer.createdAt.toISOString(),
        blocked: !!customer.blocked,
      },
      visits: visits.map((v) => ({
        startedAt: v.startedAt.toISOString(),
        durationSec: v.durationSec,
        platform: v.platform,
        model: v.model,
      })),
      products: [...byProduct.entries()]
        .map(([pid, n]) => ({ id: pid, name: names.get(pid)?.name || pid, img: names.get(pid)?.img || '', ...n }))
        .sort((a, b) => b.views - a.views || b.opens - a.opens),
    };
  }

  /** Xoá khách cùng phiên và lượt xem. Đơn giữ lại vì đã chụp tên, SĐT lúc đặt. */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Không tìm thấy người dùng');
    const customer = await this.customers.findById(id).select('_id').exec();
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');
    await Promise.all([
      this.visits.deleteMany({ customer: customer._id }).exec(),
      this.events.deleteMany({ customer: customer._id }).exec(),
    ]);
    await this.customers.deleteOne({ _id: customer._id }).exec();
  }

  private async productNames(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    const rows = unique.length ? await this.products.find({ _id: { $in: unique } }).select('name img').lean().exec() : [];
    return new Map(rows.map((p) => [String(p._id), { name: p.name, img: p.img }]));
  }
}
