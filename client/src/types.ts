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
}

export interface Bank {
  bank: string;
  bin: string;
  acc: string;
  name: string;
}

export interface Catalog {
  store: string;
  subtitle: string;
  cats: string[];
  countries: string[];
  bank: Bank;
  qr: string;
  zalo: string;
  shippingFee: number;
  products: Product[];
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
}

/** Đơn (MT……) hoặc yêu cầu tìm hộ (TH….) do server trả về. */
export interface Order {
  id: string;
  kind: "order" | "request";
  code: string;
  token: string;
  name: string;
  phone: string;
  addr: string;
  note: string;
  product: string;
  photos: string[];
  items: OrderItem[];
  shippingFee: number;
  subtotal: number;
  total: number;
  status: "pending" | "confirmed";
  paid: boolean;
  createdAt: string;
  /** Ảnh khách vừa chọn (chỉ có ở máy khách, để vẽ ảnh yêu cầu gửi Zalo). */
  shots?: File[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  note: string;
  addr: string;
}
