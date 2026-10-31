import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { toJSON } from '../common/json.js';

/** Khách mua hàng, nhận diện bằng Zalo user ID (theo Mini App). */
@Schema({ timestamps: true, toJSON })
export class Customer {
  @Prop({ required: true, unique: true }) zaloId: string;
  @Prop({ default: '' }) name: string;
  @Prop({ default: '' }) avatar: string;
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) addr: string;
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
