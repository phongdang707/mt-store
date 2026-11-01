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
}

export interface Bank {
  bank: string;
  bin: string;
  acc: string;
  name: string;
}

/** Nước đang mở đặt hàng, kèm lịch bay "dd/mm" (có thể rỗng). */
export interface Market {
  key: string;
  open: boolean;
  fly: string;
  until: string;
}

export interface Catalog {
  store: string;
  subtitle: string;
  /** Logo shop đặt trong trang quản lý; rỗng = logo mặc định. */
  logo?: string;
  cats: string[];
  /** Chỉ các nước đang mở (nước bị khoá đã ẩn cùng hàng của nó). */
  countries: string[];
  markets?: Market[];
  bank: Bank;
  qr: string;
  zalo: string;
  shippingFee: number;
  /** Tạm tính từ mức này được miễn phí giao (0 = không áp dụng). */
  freeShipFrom?: number;
  /** Ghi chú cho khách khi đặt hàng. */
  orderNote?: string;
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
  /** Phí giao thực thu (0 khi đạt mức miễn phí giao). */
  shippingFee: number;
  /** Phí giao gốc; >0 mà `shippingFee` = 0 nghĩa là được miễn phí giao. */
  shipBase?: number | null;
  freeShipFrom?: number;
  subtotal: number;
  total: number;
  status: "pending" | "confirmed" | "cancelled";
  paid: boolean;
  createdAt: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  note: string;
  addr: string;
}
