import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';

export const EVENT_TYPES = ['view', 'open', 'cart'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Khách đã xem, mở chi tiết, hoặc thêm một sản phẩm vào giỏ. */
@Schema()
export class ProductEvent {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true }) customer: Types.ObjectId;
  @Prop({ required: true }) productId: string;
  @Prop({ type: String, enum: EVENT_TYPES, required: true }) type: EventType;
  @Prop({ required: true }) at: Date;
}

export type ProductEventDocument = HydratedDocument<ProductEvent>;
export const ProductEventSchema = SchemaFactory.createForClass(ProductEvent);
ProductEventSchema.index({ at: -1 });
ProductEventSchema.index({ productId: 1, at: -1 });
ProductEventSchema.index({ customer: 1, at: -1 });
