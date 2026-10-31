import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Bank {
  @Prop({ default: '' }) bank: string;
  /** Mã BIN ngân hàng (Napas), dùng để tạo VietQR. */
  @Prop({ default: '' }) bin: string;
  @Prop({ default: '' }) acc: string;
  @Prop({ default: '' }) name: string;
}

/** Cấu hình cửa hàng, một document duy nhất `_id: 'main'`. */
@Schema({
  timestamps: true,
  toJSON: { versionKey: false, transform: (_d, r: Record<string, unknown>) => (delete r._id, r) },
})
export class Settings {
  @Prop({ type: String, default: 'main' }) _id: string;
  @Prop({ default: 'MT store' }) store: string;
  @Prop({ default: 'HÀNG XÁCH TAY' }) subtitle: string;
  /** Dòng dưới tên shop trên hoá đơn. */
  @Prop({ default: 'Hàng xách tay Nhật · Hàn · Úc' }) tagline: string;
  @Prop({ type: [String], default: [] }) cats: string[];
  @Prop({ type: [String], default: ['Nhật', 'Hàn', 'Úc'] }) countries: string[];
  @Prop({ type: Bank, default: () => ({}) }) bank: Bank;
  /** Ảnh QR tĩnh của shop (dự phòng khi không tạo được VietQR). */
  @Prop({ default: '' }) qr: string;
  /** Số Zalo của shop, khách bấm để nhắn. */
  @Prop({ default: '' }) zalo: string;
  @Prop({ default: '' }) messenger: string;
  /** Phí giao hàng cộng vào mỗi đơn có giá. 0 = không thu, ẩn dòng phí giao. */
  @Prop({ default: 0, min: 0 }) shippingFee: number;
  /** Link trang bán hàng (Zalo Mini App) cho nút "Xem trang bán hàng". */
  @Prop({ default: '' }) storefrontUrl: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
