export type InvoiceStatus = "new" | "changed" | "sent";

export interface Invoice {
  code: string;
  name: string;
  avatar: string;
  phone: string;
  total: number;
  invoiceStatus: InvoiceStatus;
  zaloUserId: string;
  items: { name: string; variantName: string; qty: number }[];
}

export interface Desk {
  store: string;
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
