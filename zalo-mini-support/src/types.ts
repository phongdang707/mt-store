export type InvoiceStatus = "new" | "changed" | "sent";

export interface Bank {
  bank: string;
  bin: string;
  acc: string;
  name: string;
}

export interface Invoice {
  code: string;
  name: string;
  avatar: string;
  phone: string;
  addr: string;
  items: { name: string; variantName: string; img: string; qty: number; price: number }[];
  subtotal: number;
  shippingFee: number;
  shipBase?: number | null;
  total: number;
  createdAt: string;
  invoiceStatus: InvoiceStatus;
  zaloUserId: string;
}

export interface Desk {
  store: string;
  tagline?: string;
  /** Logo, mã QR và tài khoản ngân hàng của shop, để vẽ ảnh hoá đơn giống admin. */
  logo?: string;
  qr?: string;
  bank?: Bank;
  invoices: Invoice[];
}

export interface Me {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  role?: "customer" | "support";
}

export interface Person {
  zaloUserId: string;
  name: string;
  avatar: string;
  phone: string;
  orders: number;
  open: number;
}

export type OrderKind = "order" | "request";
export type OrderStatus = "pending" | "confirmed" | "cancelled";

export interface Order {
  code: string;
  kind: OrderKind;
  status: OrderStatus;
  paid: boolean;
  name: string;
  avatar: string;
  phone: string;
  addr: string;
  note: string;
  product: string;
  photos: string[];
  items: { name: string; variantName: string; img: string; qty: number; price: number }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  invoiceStatus: InvoiceStatus | null;
  zaloUserId: string;
}

export interface OrderBook {
  store: string;
  orders: Order[];
}
