export interface Variant {
  name: string;
  img: string;
}

export interface Product {
  id: string;
  name: string;
  cat: string;
  price: number;
  market: number;
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

export interface Settings {
  store: string;
  subtitle: string;
  tagline: string;
  cats: string[];
  countries: string[];
  bank: Bank;
  qr: string;
  zalo: string;
  messenger: string;
  shippingFee: number;
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
  subtotal: number;
  total: number;
  status: "pending" | "confirmed";
  confirmedAt?: string;
  paid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
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
