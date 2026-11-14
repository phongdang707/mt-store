import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Bank {
  @Prop({ default: '' }) bank: string;
  /** Mã BIN ngân hàng (Napas), dùng để tạo VietQR. Trang quản lý tự suy từ tên ngân hàng. */
  @Prop({ default: '' }) bin: string;
  @Prop({ default: '' }) acc: string;
  @Prop({ default: '' }) name: string;
}

/** Các nước shop đi mua, theo thứ tự hiện trên trang bán hàng. */
export const MARKET_KEYS = ['Nhật', 'Hàn', 'Úc', 'Trung'] as const;

/** Một nước: đang mở đặt hàng hay đã khoá, kèm lịch bay (dd/mm). */
@Schema({ _id: false })
export class Market {
  @Prop({ required: true }) key: string;
  @Prop({ default: false }) open: boolean;
  /** Ngày bay, dạng "dd/mm". */
  @Prop({ default: '' }) fly: string;
  /** Nhận đơn đến hết ngày, dạng "dd/mm". */
  @Prop({ default: '' }) until: string;
}

@Schema({ _id: false })
export class Prefs {
  /** Báo khi có đơn mới: chấm đỏ + tiếng trên trang quản lý. */
  @Prop({ default: true }) notiOrder: boolean;
  /** Báo khi có yêu cầu tìm hộ. */
  @Prop({ default: true }) notiFind: boolean;
  /** Ẩn doanh thu khi mở trang. */
  @Prop({ default: false }) hideRev: boolean;
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
  /** Logo shop (rỗng = logo mặc định). */
  @Prop({ default: '' }) logo: string;
  /** Dòng dưới tên shop trên hoá đơn. */
  @Prop({ default: 'Hàng xách tay Nhật · Hàn · Úc' }) tagline: string;
  @Prop({ type: [String], default: [] }) cats: string[];
  /** Nước đang mở đặt hàng (suy từ `markets`, giữ để trang bán hàng cũ vẫn chạy). */
  @Prop({ type: [String], default: ['Nhật', 'Hàn', 'Úc'] }) countries: string[];
  @Prop({ type: [SchemaFactory.createForClass(Market)], default: [] }) markets: Market[];
  @Prop({ type: Bank, default: () => ({}) }) bank: Bank;
  /** Ảnh QR tĩnh của shop (dự phòng khi không tạo được VietQR). */
  @Prop({ default: '' }) qr: string;
  /** Số liên hệ cũ của shop. Trang bán hàng nhắn qua Messenger. */
  @Prop({ default: '' }) zalo: string;
  @Prop({ default: '' }) messenger: string;
  /** Phí giao hàng cộng vào mỗi đơn có giá. 0 = không thu, ẩn dòng phí giao. */
  @Prop({ default: 0, min: 0 }) shippingFee: number;
  /** Đơn có tạm tính từ mức này trở lên được miễn phí giao. 0 = không áp dụng. */
  @Prop({ default: 0, min: 0 }) freeShipFrom: number;
  /** Ghi chú cho khách khi đặt hàng (hiện ở giỏ hàng). */
  @Prop({ default: '' }) orderNote: string;
  @Prop({ type: SchemaFactory.createForClass(Prefs), default: () => ({}) }) prefs: Prefs;
  /** Link trang bán hàng cho nút "Xem trang bán hàng". */
  @Prop({ default: '' }) storefrontUrl: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
