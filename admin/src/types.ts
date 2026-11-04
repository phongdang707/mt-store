export interface Variant {
  name: string;
  img: string;
}

export interface Product {
  id: string;
  name: string;
  cat: string;
  price: number;
  country: string;
  img: string;
  variants: Variant[];
  vlabel: string;
  link: string;
  hot: boolean;
  best: boolean;
  soldout: boolean;
  updatedAt?: string;
}

export interface Bank {
  bank: string;
  bin: string;
  acc: string;
  name: string;
}

/** Nước shop đi mua: mở đặt hàng hay đã khoá, lịch bay "dd/mm". */
export interface Market {
  key: string;
  open: boolean;
  fly: string;
  until: string;
}

export interface Prefs {
  notiOrder: boolean;
  notiFind: boolean;
  hideRev: boolean;
}

export interface Settings {
  store: string;
  subtitle: string;
  logo: string;
  tagline: string;
  cats: string[];
  /** Nước đang mở (server suy từ `markets`). */
  countries: string[];
  /** Đủ 4 nước Nhật, Hàn, Úc, Trung theo thứ tự. */
  markets: Market[];
  bank: Bank;
  qr: string;
  zalo: string;
  messenger: string;
  shippingFee: number;
  freeShipFrom: number;
  orderNote: string;
  prefs: Prefs;
  storefrontUrl: string;
}

export interface OrderItem {
  productId: string;
  variant: number | null;
  variantName: string;
  name: string;
  country: string;
  img: string;
  price: number;
  qty: number;
  addedLater: boolean;
}

export type InvoiceVia = "zalo" | "messenger" | "link" | "png";

export interface Order {
  id: string;
  kind: "order" | "request";
  code: string;
  token: string;
  name: string;
  avatar: string;
  phone: string;
  addr: string;
  note: string;
  product: string;
  photos: string[];
  items: OrderItem[];
  quoteTotal: number;
  shippingFee: number;
  shipBase?: number | null;
  freeShipFrom?: number;
  subtotal: number;
  total: number;
  status: "pending" | "confirmed" | "cancelled";
  confirmedAt?: string;
  cancelledAt?: string;
  /** Chỉ có trên API admin. */
  cancelReason?: string;
  paid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  /** Khách Zalo của đơn. Có trên API admin. */
  customer?: string;
  blocked?: boolean;
  invoice: { version: number; sends: { version: number; via: InvoiceVia; at: string }[]; log: { at: string; msg: string }[] };
  invoiceStatus: "new" | "changed" | "sent" | null;
  shots?: File[];
}

export interface Badges {
  pendingOrders: number;
  pendingRequests: number;
  products: number;
  unsentInvoices: number;
}

export interface AnalyticsSummary {
  activeUsers: number;
  newUsers: number;
  visits: number;
  durationSec: number;
  avgSessionSec: number;
  avgUserSec: number;
  views: number;
  opens: number;
  carts: number;
  orders: number;
  viewers: number;
  cartUsers: number;
  orderUsers: number;
}

export interface AnalyticsProduct {
  id: string;
  name: string;
  img: string;
  views: number;
  viewers: number;
  opens: number;
  carts: number;
  orders: number;
}

export interface AnalyticsUser {
  id: string;
  name: string;
  zaloName: string;
  avatar: string;
  phone: string;
  platform: string;
  model: string;
  lastSeenAt: string | null;
  visits: number;
  durationSec: number;
  blocked: boolean;
  support: boolean;
  products: { id: string; name: string; views: number }[];
}

export interface Analytics {
  days: number;
  summary: AnalyticsSummary;
  rates: { view: number; cart: number; order: number };
  platforms: { platform: string; users: number }[];
  daily: { date: string; visits: number; durationSec: number; views: number }[];
  products: AnalyticsProduct[];
  users: AnalyticsUser[];
}

export interface AnalyticsUserDetail {
  days: number;
  orders: number;
  user: {
    id: string;
    name: string;
    zaloName: string;
    avatar: string;
    phone: string;
    platform: string;
    os: string;
    model: string;
    zaloVersion: string;
    language: string;
    lastSeenAt: string | null;
    visitCount: number;
    createdAt: string;
    blocked: boolean;
    support: boolean;
  };
  activity: { date: string; visits: number; durationSec: number }[];
  products: { id: string; name: string; img: string; views: number; opens: number; carts: number }[];
}

export type LogLevel = "error" | "warn" | "info";
export type LogSource = "http" | "webhook" | "zalo" | "app";

export interface AppLog {
  id: string;
  at: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  status?: number;
  method?: string;
  path?: string;
}

export interface AppLogDetail extends AppLog {
  stack?: string;
  meta?: Record<string, string | number>;
}

export interface AppLogPage {
  items: AppLog[];
  next: string | null;
}
