import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model, type PipelineStage } from 'mongoose';
import { Customer, type CustomerDocument } from '../customers/customer.schema.js';
import { Order } from '../orders/order.schema.js';
import { Product } from '../products/product.schema.js';
import type { DaysQuery, EventsDto, VisitDto } from './analytics.dto.js';
import { ProductEvent, type EventType } from './analytics.schema.js';

const GAP_MS = 30 * 60_000;
const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;
const KEEP_DAYS = 90;

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

function vnDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Đầu ngày theo giờ Việt Nam, lùi `days - 1` ngày, tới lúc gọi. */
export function period(days: number) {
  const today = vnDate(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d, -7) - (days - 1) * DAY);
  const to = new Date();
  const labels = Array.from({ length: days }, (_, i) => vnDate(new Date(from.getTime() + i * DAY + 3_600_000)));
  return { from, to, labels };
}

const rate = (n: number, d: number) => (d ? n / d : 0);

type DayStat = { date: string; visits: number; durationSec: number };

type ActiveRow = {
  _id: Types.ObjectId;
  name?: string;
  zaloName?: string;
  avatar?: string;
  phone?: string;
  platform?: string;
  model?: string;
  lastSeenAt?: Date;
  blocked?: boolean;
  activity: DayStat[];
};

const dayTotals = (days: DayStat[]) => {
  let visits = 0;
  let duration = 0;
  for (const day of days) {
    visits += day.visits || 0;
    duration += day.durationSec || 0;
  }
  return { visits, duration };
};

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly log = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<Customer>,
    @InjectModel(ProductEvent.name) private readonly events: Model<ProductEvent>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
  ) {}

  /** Xoá collection phiên cũ và đổi field `zaloId` còn sót thành `zaloUserId`. */
  async onModuleInit() {
    const db = this.customers.db.db;
    if (!db) return;
    const customers = db.collection('customers');
    const indexes = await customers.indexes();
    if (indexes.some((index) => index.name === 'zaloId_1')) await customers.dropIndex('zaloId_1');
    if (await db.listCollections({ name: 'visits' }).hasNext()) {
      await db.collection('visits').drop();
      this.log.log('Đã xoá collection visits');
    }
    const renamed = await customers.updateMany(
      { zaloId: { $exists: true }, zaloUserId: { $exists: false } },
      { $rename: { zaloId: 'zaloUserId' } },
    );
    if (renamed.modifiedCount) this.log.log(`Đã đổi zaloId thành zaloUserId trên ${renamed.modifiedCount} khách`);
    await this.customers.syncIndexes();
  }

  /** Ghi hồ sơ, máy, và cộng giây vào ngày của phiên đang mở. */
  async visit(customer: CustomerDocument, dto: VisitDto) {
    const now = new Date();
    const seconds = dto.seconds ?? 0;
    const device = {
      platform: platformOf(dto.platform),
      os: text(dto.os, 64),
      model: text(dto.model, 64),
      zaloVersion: text(dto.zaloVersion, 32),
    };
    const profile: Record<string, string | Date> = { lastSeenAt: now };
    const zaloName = text(dto.zaloName || dto.name, 120);
    const language = text(dto.language, 16);
    const avatar = avatarUrl(dto.avatar);
    if (zaloName) profile.zaloName = zaloName;
    if (language) profile.language = language;
    if (avatar) profile.avatar = avatar;
    for (const key of ['platform', 'os', 'model', 'zaloVersion'] as const) {
      if (device[key]) profile[key] = device[key];
    }
    await this.customers.updateOne({ _id: customer._id }, this.beatStages(now, seconds, profile), { updatePipeline: true }).exec();
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
    const start = labels[0];
    const end = labels[labels.length - 1];

    const [active, eventRoll, newUsers, orderRoll, dailyViews, productRoll, orderProducts] = await Promise.all([
      this.customers
        .aggregate<ActiveRow>([
          { $match: { 'activity.date': { $gte: start, $lte: end } } },
          {
            $project: {
              name: 1,
              zaloName: 1,
              avatar: 1,
              phone: 1,
              platform: 1,
              model: 1,
              lastSeenAt: 1,
              blocked: 1,
              activity: {
                $filter: {
                  input: { $ifNull: ['$activity', []] },
                  as: 'd',
                  cond: { $and: [{ $gte: ['$$d.date', start] }, { $lte: ['$$d.date', end] }] },
                },
              },
            },
          },
        ])
        .exec(),
      this.events.aggregate<{ _id: EventType; n: number; users: Types.ObjectId[] }>([
        { $match: { at: span } },
        { $group: { _id: '$type', n: { $sum: 1 }, users: { $addToSet: '$customer' } } },
      ]),
      this.customers.countDocuments({ createdAt: span }).exec(),
      this.orders.aggregate<{ n: number; users: Types.ObjectId[] }>([
        { $match: { kind: 'order', createdAt: span } },
        { $group: { _id: null, n: { $sum: 1 }, users: { $addToSet: '$customer' } } },
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
    ]);

    const byType = (t: EventType) => eventRoll.find((r) => r._id === t);
    const views = byType('view');
    const opens = byType('open');
    const carts = byType('cart');
    const viewers = views?.users.length ?? 0;
    const cartUsers = carts?.users.length ?? 0;
    const orderUsers = orderRoll[0]?.users.length ?? 0;
    let visitCount = 0;
    let duration = 0;
    const byDay = new Map<string, { visits: number; duration: number }>();
    const byPlatform = new Map<string, number>();
    for (const row of active) {
      const platform = row.platform || 'web';
      byPlatform.set(platform, (byPlatform.get(platform) ?? 0) + 1);
      for (const day of row.activity) {
        visitCount += day.visits || 0;
        duration += day.durationSec || 0;
        const slot = byDay.get(day.date) ?? { visits: 0, duration: 0 };
        slot.visits += day.visits || 0;
        slot.duration += day.durationSec || 0;
        byDay.set(day.date, slot);
      }
    }
    const activeUsers = active.length;

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

    const ranked = [...active].sort((a, b) => +new Date(b.lastSeenAt ?? 0) - +new Date(a.lastSeenAt ?? 0)).slice(0, 200);
    const userIds = ranked.map((r) => r._id);
    const [blockedAway, previews] = await Promise.all([
      this.customers.find(userIds.length ? { blocked: true, _id: { $nin: userIds } } : { blocked: true }).exec(),
      this.events.aggregate<{ _id: Types.ObjectId; products: { productId: string; views: number }[] }>([
        { $match: { at: span, type: 'view', customer: { $in: userIds } } },
        { $group: { _id: { customer: '$customer', productId: '$productId' }, views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $group: { _id: '$_id.customer', products: { $push: { productId: '$_id.productId', views: '$views' } } } },
        { $project: { products: { $slice: ['$products', 3] } } },
      ]),
    ]);
    const preview = new Map(previews.map((r) => [String(r._id), r.products]));
    const viewByDay = new Map(dailyViews.map((r) => [r._id, r.views]));
    const order = ['ios', 'android', 'web'];
    const rank = (p: string) => {
      const i = order.indexOf(p);
      return i < 0 ? order.length : i;
    };

    return {
      days,
      summary: {
        activeUsers,
        newUsers,
        visits: visitCount,
        durationSec: duration,
        avgSessionSec: visitCount ? Math.round(duration / visitCount) : 0,
        avgUserSec: activeUsers ? Math.round(duration / activeUsers) : 0,
        views: views?.n ?? 0,
        opens: opens?.n ?? 0,
        carts: carts?.n ?? 0,
        orders: orderRoll[0]?.n ?? 0,
        viewers,
        cartUsers,
        orderUsers,
      },
      rates: { view: rate(viewers, activeUsers), cart: rate(cartUsers, viewers), order: rate(orderUsers, activeUsers) },
      platforms: [...byPlatform.entries()]
        .map(([platform, users]) => ({ platform, users }))
        .sort((a, b) => rank(a.platform) - rank(b.platform) || b.users - a.users),
      daily: labels.map((date) => ({
        date,
        visits: byDay.get(date)?.visits ?? 0,
        durationSec: byDay.get(date)?.duration ?? 0,
        views: viewByDay.get(date) ?? 0,
      })),
      products: productRows,
      users: [
        ...ranked.map((c) => {
          const seen = preview.get(String(c._id)) ?? [];
          const totals = dayTotals(c.activity);
          return {
            id: String(c._id),
            name: c.name || '',
            zaloName: c.zaloName || '',
            avatar: c.avatar || '',
            phone: c.phone || '',
            platform: c.platform || '',
            model: c.model || '',
            lastSeenAt: c.lastSeenAt ? new Date(c.lastSeenAt).toISOString() : null,
            visits: totals.visits,
            durationSec: totals.duration,
            blocked: !!c.blocked,
            products: seen.map((p) => ({ id: p.productId, name: names.get(p.productId)?.name || p.productId, views: p.views })),
          };
        }),
        ...blockedAway.map((c) => ({
          id: String(c._id),
          name: c.name || '',
          zaloName: c.zaloName || '',
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
    const { from, to, labels } = period(days);
    const span = { $gte: from, $lte: to };
    const start = labels[0];
    const end = labels[labels.length - 1];
    const cid = customer._id;

    const [productRoll, orders] = await Promise.all([
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
        zaloName: customer.zaloName,
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
      activity: (customer.activity ?? [])
        .filter((day) => day.date >= start && day.date <= end)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((day) => ({ date: day.date, visits: day.visits, durationSec: day.durationSec })),
      products: [...byProduct.entries()]
        .map(([pid, n]) => ({ id: pid, name: names.get(pid)?.name || pid, img: names.get(pid)?.img || '', ...n }))
        .sort((a, b) => b.views - a.views || b.opens - a.opens),
    };
  }

  /** Xoá khách và lượt xem. Đơn giữ lại vì đã chụp tên, SĐT lúc đặt. */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Không tìm thấy người dùng');
    const customer = await this.customers.findById(id).select('_id').exec();
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');
    await this.events.deleteMany({ customer: customer._id }).exec();
    await this.customers.deleteOne({ _id: customer._id }).exec();
  }

  /**
   * Khách rút đồng ý trên Zalo. Xoá hồ sơ và lượt xem.
   * Đơn giữ món và số tiền; gỡ tên, SĐT, địa chỉ, ghi chú và ảnh tìm hộ.
   */
  async revokeZaloUser(zaloUserId: string) {
    const customer = await this.customers.findOne({ zaloUserId }).select('_id').exec();
    if (!customer) return { found: false, photos: [] as string[] };
    const id = customer._id;
    const rows = await this.orders.find({ customer: id }).select('photos').lean().exec();
    const photos = [...new Set(rows.flatMap((row) => row.photos ?? []).filter((url) => url.length > 0))];
    await Promise.all([
      this.events.deleteMany({ customer: id }).exec(),
      this.orders
        .updateMany({ customer: id }, { $set: { name: '', avatar: '', phone: '', addr: '', note: '', product: '', photos: [] } })
        .exec(),
    ]);
    await this.customers.deleteOne({ _id: id }).exec();
    return { found: true, photos };
  }

  private beatStages(now: Date, seconds: number, profile: Record<string, string | Date>): PipelineStage[] {
    const today = vnDate(now);
    const cutoff = period(KEEP_DAYS).labels[0];
    const beatAt = new Date(now.getTime() - GAP_MS);
    return [
      {
        $set: {
          ...profile,
          beatOpen: {
            $and: [{ $ne: [{ $ifNull: ['$lastBeatAt', null] }, null] }, { $gte: ['$lastBeatAt', beatAt] }],
          },
        },
      },
      {
        $set: {
          beatDate: {
            $cond: [
              '$beatOpen',
              { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$sessionDate', ''] } }, 0] }, '$sessionDate', today] },
              today,
            ],
          },
          beatInc: { $cond: ['$beatOpen', 0, 1] },
        },
      },
      {
        $set: {
          sessionDate: '$beatDate',
          lastBeatAt: now,
          visitCount: { $add: [{ $ifNull: ['$visitCount', 0] }, '$beatInc'] },
          activity: {
            $let: {
              vars: {
                kept: {
                  $filter: {
                    input: { $ifNull: ['$activity', []] },
                    as: 'd',
                    cond: { $gte: ['$$d.date', cutoff] },
                  },
                },
              },
              in: {
                $cond: [
                  { $in: ['$beatDate', { $map: { input: '$$kept', as: 'd', in: '$$d.date' } }] },
                  {
                    $map: {
                      input: '$$kept',
                      as: 'd',
                      in: {
                        $cond: [
                          { $eq: ['$$d.date', '$beatDate'] },
                          {
                            date: '$$d.date',
                            visits: { $add: [{ $ifNull: ['$$d.visits', 0] }, '$beatInc'] },
                            durationSec: { $add: [{ $ifNull: ['$$d.durationSec', 0] }, seconds] },
                          },
                          '$$d',
                        ],
                      },
                    },
                  },
                  { $concatArrays: ['$$kept', [{ date: '$beatDate', visits: '$beatInc', durationSec: seconds }]] },
                ],
              },
            },
          },
        },
      },
      { $unset: ['beatOpen', 'beatDate', 'beatInc'] },
    ];
  }

  private async productNames(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    const rows = unique.length ? await this.products.find({ _id: { $in: unique } }).select('name img').lean().exec() : [];
    return new Map(rows.map((p) => [String(p._id), { name: p.name, img: p.img }]));
  }
}
