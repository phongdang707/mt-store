import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { toJSON } from '../common/json.js';

/** Khách mua hàng, nhận diện bằng Zalo user ID (theo Mini App). */
@Schema({ timestamps: true, toJSON })
export class Customer {
  @Prop({ required: true, unique: true }) zaloId: string;
  /** Tên khách điền khi đặt hàng. Không lấy từ hồ sơ Zalo. */
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
  @Prop({ default: 0, min: 0 }) visitCount: number;
  /** Admin chặn: khách không đặt hàng, gửi tìm hộ, hay gọi API mini app. */
  @Prop({ default: false }) blocked: boolean;
  @Prop() blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
