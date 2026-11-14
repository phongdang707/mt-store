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

/** Khách mua hàng. Đăng nhập mới khóa bằng facebookUserId. zaloUserId chỉ còn trên hồ sơ cũ. */
@Schema({ timestamps: true, toJSON })
export class Customer {
  /** Hồ sơ tạo từ Zalo trước khi chuyển Facebook. Không ghi cho khách mới. */
  @Prop({ unique: true, sparse: true }) zaloUserId?: string;
  /** Id ứng dụng Facebook. Khóa đăng nhập. */
  @Prop({ unique: true, sparse: true }) facebookUserId?: string;
  /** Tên trên đơn gần nhất. */
  @Prop({ default: '' }) name: string;
  /** Tên Facebook lúc đăng nhập. */
  @Prop({ default: '' }) facebookName: string;
  /** Tên Zalo của hồ sơ cũ. */
  @Prop({ default: '' }) zaloName: string;
  @Prop({ default: '' }) email: string;
  @Prop({ default: '' }) avatar: string;
  /** Page-scoped id, có sau khi khách mở m.me kèm ref. */
  @Prop({ default: '' }) messengerPsid: string;
  /** Lần khách nhắn Page gần nhất. Cửa sổ gửi tin là 24 giờ kể từ mốc này. */
  @Prop() messengerLastAt?: Date;
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
  /** Admin chặn: khách không đặt hàng, gửi tìm hộ, hay gọi API shop. */
  @Prop({ default: false }) blocked: boolean;
  /** `support`: trang web hiện mục chăm sóc khách hàng. */
  @Prop({ type: String, enum: CUSTOMER_ROLES, default: 'customer' }) role: CustomerRole;
  /** Access token Graph, bản dài hạn. Không trả ra API. */
  @Prop({ select: false, default: '' }) facebookAccessToken: string;
  @Prop({ select: false }) facebookAccessExp?: Date;
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
    delete out.facebookAccessToken;
    delete out.facebookAccessExp;
    delete out.zaloAccessToken;
    delete out.zaloRefreshToken;
    delete out.zaloAccessExp;
    return out;
  },
});
