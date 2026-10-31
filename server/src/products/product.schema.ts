import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { toJSON } from '../common/json.js';

@Schema({ _id: false })
export class Variant {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ default: '' }) img: string;
}

/**
 * Cùng hình dạng với sản phẩm trong app bán hàng. `_id` là mã dạng chuỗi
 * (`p1`, `ky_eye4`…), trả ra ngoài là `id`. Thứ tự hiển thị theo `sort` tăng dần.
 */
@Schema({ timestamps: true, toJSON })
export class Product {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, index: true }) cat: string;
  /** Giá bán (VND). 0 = khách thấy "Đang cập nhật". */
  @Prop({ default: 0, min: 0 }) price: number;
  /** Giá thị trường (VND), 0 nếu không có. */
  @Prop({ default: 0, min: 0 }) market: number;
  @Prop({ default: 'Nhật', index: true }) country: string;
  @Prop({ default: '' }) img: string;
  @Prop({ type: [SchemaFactory.createForClass(Variant)], default: [] }) variants: Variant[];
  /** Chữ thay cho "tone" (vd "loại"). */
  @Prop({ default: '' }) vlabel: string;
  /** Sản phẩm dạng link cửa hàng chính hãng: khách bấm ra web hãng, không đặt trực tiếp. */
  @Prop({ default: '' }) link: string;
  @Prop({ default: false }) hot: boolean;
  @Prop({ default: false }) best: boolean;
  @Prop({ default: false }) soldout: boolean;
  @Prop({ default: 0, index: true }) sort: number;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);
