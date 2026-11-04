import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { toJSON } from '../common/json.js';

/** Một ngày mở app, theo giờ Việt Nam. */
@Schema({ _id: false })
export class ActivityDay {
  /** `YYYY-MM-DD`. */
  @Prop({ required: true }) date: string;
  @Prop({ default: 0, min: 0 }) visits: number;
  /** Giây app đang hiện trên màn hình. */
  @Prop({ default: 0, min: 0 }) durationSec: number;
}

export const ActivityDaySchema = SchemaFactory.createForClass(ActivityDay);

export const CUSTOMER_ROLES = ['customer', 'support'] as const;
export type CustomerRole = (typeof CUSTOMER_ROLES)[number];

/** Khách mua hàng, nhận diện bằng zaloUserId của Zalo Mini App. */
@Schema({ timestamps: true, toJSON })
export class Customer {
  @Prop({ required: true, unique: true }) zaloUserId: string;
  /** Tên trên đơn gần nhất. Form không có ô tên, nên đây là tên Zalo lúc gửi. */
  @Prop({ default: '' }) name: string;
  /** Tên hiển thị trên Zalo, từ `getUserInfo` lúc mở app. */
  @Prop({ default: '' }) zaloName: string;
  @Prop({ default: '' }) avatar: string;
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) addr: string;
  /** ios, android hoặc web. Cập nhật mỗi lần mở app. */
  @Prop({ default: '' }) platform: string;
  @Prop({ default: '' }) os: string;
  @Prop({ default: '' }) model: string;
  @Prop({ default: '' }) zaloVersion: string;
  @Prop({ default: '' }) language: string;
  @Prop() lastSeenAt?: Date;
  /** Mốc nhịp gần nhất. Phiên mới khi cách hơn 30 phút. */
  @Prop() lastBeatAt?: Date;
  /** Ngày phiên đang mở bắt đầu, `YYYY-MM-DD` giờ Việt Nam. */
  @Prop({ default: '' }) sessionDate: string;
  /** Lượt vào và số giây, giữ 90 ngày. */
  @Prop({ type: [ActivityDaySchema], default: [] }) activity: ActivityDay[];
  @Prop({ default: 0, min: 0 }) visitCount: number;
  /** Admin chặn: khách không đặt hàng, gửi tìm hộ, hay gọi API mini app. */
  @Prop({ default: false }) blocked: boolean;
  /** `support`: mở Mini App thì thấy mục chăm sóc khách hàng. */
  @Prop({ type: String, enum: CUSTOMER_ROLES, default: 'customer' }) role: CustomerRole;
  /** Access token OAuth web. Không trả ra API. */
  @Prop({ select: false, default: '' }) zaloAccessToken: string;
  @Prop({ select: false }) zaloAccessExp?: Date;
  /** Refresh token dùng một lần. Lưu bản mới sau mỗi lần làm mới. */
  @Prop({ select: false, default: '' }) zaloRefreshToken: string;
  @Prop() blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ 'activity.date': 1 });
CustomerSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    const out = ret as unknown as Record<string, unknown>;
    out.id = String(out._id);
    delete out._id;
    delete out.zaloAccessToken;
    delete out.zaloRefreshToken;
    delete out.zaloAccessExp;
    return out;
  },
});
