import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, type HydratedDocument } from 'mongoose';
import { toJSON } from '../common/json.js';

export const ORDER_KINDS = ['order', 'request'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];
export const ORDER_STATUSES = ['pending', 'confirmed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const SEND_VIA = ['zalo', 'messenger', 'link', 'png'] as const;
export type SendVia = (typeof SEND_VIA)[number];

@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true }) productId: string;
  /** Vị trí tone trong `variants` của sản phẩm lúc đặt; null nếu không có tone. */
  @Prop({ type: Number, default: null }) variant: number | null;
  @Prop({ default: '' }) variantName: string;
  @Prop({ required: true }) name: string;
  @Prop({ default: 'Nhật' }) country: string;
  @Prop({ default: '' }) img: string;
  /** Giá 1 món (VND) lúc đặt hoặc do shop báo giá. 0 = chờ báo giá. */
  @Prop({ default: 0, min: 0 }) price: number;
  @Prop({ required: true, min: 1 }) qty: number;
  /** Món thêm sau khi đã tạo hoá đơn ("Khách thêm"). */
  @Prop({ default: false }) addedLater: boolean;
}

@Schema({ _id: false })
export class InvoiceSend {
  @Prop({ required: true }) version: number;
  @Prop({ type: String, enum: SEND_VIA, required: true }) via: SendVia;
  @Prop({ required: true }) at: Date;
}

@Schema({ _id: false })
export class InvoiceLog {
  @Prop({ required: true }) at: Date;
  @Prop({ required: true }) msg: string;
}

/** Hoá đơn gắn với đơn: tạo khi xác nhận, `version` tăng mỗi lần sửa món. */
@Schema({ _id: false })
export class Invoice {
  @Prop({ default: 0 }) version: number;
  @Prop({ type: [SchemaFactory.createForClass(InvoiceSend)], default: [] }) sends: InvoiceSend[];
  @Prop({ type: [SchemaFactory.createForClass(InvoiceLog)], default: [] }) log: InvoiceLog[];
}

/**
 * Đơn đặt hàng (`kind: order`, mã MT……) hoặc yêu cầu tìm hộ theo ảnh (`kind: request`, mã TH….).
 * Thông tin khách là bản chụp lúc gửi.
 */
@Schema({ timestamps: true, toJSON })
export class Order {
  @Prop({ type: String, enum: ORDER_KINDS, default: 'order', index: true }) kind: OrderKind;
  @Prop({ required: true, unique: true }) code: string;
  /** Mã bí mật cho link xem hoá đơn công khai. */
  @Prop({ required: true, unique: true }) token: string;
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true }) customer: Types.ObjectId;
  @Prop({ default: '' }) name: string;
  @Prop({ default: '' }) avatar: string;
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) addr: string;
  @Prop({ default: '' }) note: string;
  /** Món khách cần tìm (yêu cầu tìm hộ). */
  @Prop({ default: '' }) product: string;
  @Prop({ type: [String], default: [] }) photos: string[];
  @Prop({ type: [SchemaFactory.createForClass(OrderItem)], default: [] }) items: OrderItem[];
  /** Giá shop báo cho yêu cầu tìm hộ (không có món cụ thể). */
  @Prop({ default: 0, min: 0 }) quoteTotal: number;
  @Prop({ default: 0, min: 0 }) shippingFee: number;
  @Prop({ default: 0 }) subtotal: number;
  @Prop({ default: 0 }) total: number;
  @Prop({ type: String, enum: ORDER_STATUSES, default: 'pending', index: true }) status: OrderStatus;
  @Prop() confirmedAt?: Date;
  /** Khách bấm "Tôi đã chuyển khoản". */
  @Prop({ default: false }) paid: boolean;
  @Prop() paidAt?: Date;
  @Prop() quotedAt?: Date;
  @Prop({ type: SchemaFactory.createForClass(Invoice), default: () => ({}) }) invoice: Invoice;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ createdAt: -1 });

/** Tạm tính = tổng món có giá (hoặc giá báo cho yêu cầu tìm hộ); tổng = tạm tính + phí giao nếu có giá. */
export function recompute(o: Order) {
  o.subtotal = o.items.length ? o.items.reduce((a, x) => a + x.price * x.qty, 0) : o.quoteTotal;
  o.total = o.subtotal ? o.subtotal + o.shippingFee : 0;
}

/** `new`: chưa gửi khách, `changed`: sửa sau lần gửi cuối, `sent`: đã gửi bản mới nhất. */
export function invoiceStatus(o: Order) {
  const last = o.invoice.sends.at(-1);
  if (!last) return 'new';
  return o.invoice.version > last.version ? 'changed' : 'sent';
}
