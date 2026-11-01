import type { Analytics, AnalyticsUserDetail, Badges, InvoiceVia, Order, Product, Settings } from "./types";

export const API = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "") + "/api";

const KEY = "mt_admin_token";
export const auth = {
  get: () => localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "",
  set(token: string, remember: boolean) {
    (remember ? localStorage : sessionStorage).setItem(KEY, token);
  },
  clear() {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (f: () => void) => (onUnauthorized = f);

const FIXTURE = import.meta.env.VITE_FIXTURE === "1";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (FIXTURE) {
    const { handle } = await import("./fixture");
    try {
      return await handle<T>(method, path, body);
    } catch (e) {
      throw new ApiError((e as Error).message, (e as { status?: number }).status ?? 500);
    }
  }
  const headers: Record<string, string> = {};
  const t = auth.get();
  if (t) headers.authorization = "Bearer " + t;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    auth.clear();
    onUnauthorized();
  }
  if (!res.ok) {
    const m = (data as { message?: string | string[] } | null)?.message;
    throw new ApiError(Array.isArray(m) ? m[0] : m || "Có lỗi xảy ra, thử lại sau", res.status);
  }
  return data as T;
}

const q = (o: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
  return s ? "?" + s : "";
};

export const api = {
  login: (email: string, password: string, remember: boolean) =>
    call<{ token: string; admin: { email: string; name: string } }>("POST", "/auth/login", { email, password, remember }),
  changePassword: (current: string, next: string) => call<null>("POST", "/auth/password", { current, next }),
  me: () => call<{ email: string; name: string }>("GET", "/auth/me"),
  badges: () => call<Badges>("GET", "/admin/badges"),
  analytics: (days: number) => call<Analytics>("GET", "/admin/analytics?days=" + days),
  analyticsUser: (id: string, days: number) => call<AnalyticsUserDetail>("GET", `/admin/analytics/users/${encodeURIComponent(id)}?days=${days}`),
  blockCustomer: (id: string, blocked: boolean) => call<{ id: string; blocked: boolean }>("PATCH", `/admin/customers/${encodeURIComponent(id)}`, { blocked }),
  deleteUser: (id: string) => call<null>("DELETE", `/admin/analytics/users/${encodeURIComponent(id)}`),
  months: () => call<string[]>("GET", "/admin/orders/months"),
  orders: (p: { kind?: string; month?: string; status?: string }) => call<Order[]>("GET", "/admin/orders" + q(p)),
  confirm: (code: string, on: boolean) => call<Order>("POST", `/admin/orders/${code}/${on ? "confirm" : "unconfirm"}`),
  updateOrder: (code: string, b: { quoteTotal?: number; shippingFee?: number }) => call<Order>("PATCH", `/admin/orders/${code}`, b),
  addItem: (code: string, b: { productId: string; variant?: number; qty: number }) => call<Order>("POST", `/admin/orders/${code}/items`, b),
  updateItem: (code: string, idx: number, b: { qty?: number; price?: number }) => call<Order>("PATCH", `/admin/orders/${code}/items/${idx}`, b),
  removeItem: (code: string, idx: number) => call<Order>("DELETE", `/admin/orders/${code}/items/${idx}`),
  send: (code: string, via: InvoiceVia) => call<Order>("POST", `/admin/orders/${code}/send`, { via }),
  products: () => call<Product[]>("GET", "/admin/products"),
  createProduct: (b: Partial<Product>) => call<Product>("POST", "/admin/products", b),
  updateProduct: (id: string, b: Partial<Product>) => call<Product>("PATCH", `/admin/products/${encodeURIComponent(id)}`, b),
  deleteProduct: (id: string) => call<null>("DELETE", `/admin/products/${encodeURIComponent(id)}`),
  settings: () => call<Settings>("GET", "/admin/settings"),
  saveSettings: (b: Partial<Settings>) => call<Settings>("PATCH", "/admin/settings", b),
  upload: (file: Blob) => {
    const fd = new FormData();
    fd.append("file", file, "image.jpg");
    return call<{ url: string }>("POST", "/admin/uploads", fd);
  },
  publicInvoice: (token: string) =>
    call<{ order: Order; shop: Pick<Settings, "store" | "tagline" | "logo" | "zalo" | "bank" | "qr"> }>("GET", `/invoices/${token}`),
};

export interface OrderEvent {
  type: "order";
  code: string;
  kind: "order" | "request";
  action: "created" | "updated" | "paid";
}

/** Đơn mới / đổi trạng thái: server đẩy sự kiện, trang tải lại dữ liệu. */
export function subscribe(onChange: (e: OrderEvent | null) => void) {
  if (FIXTURE) return () => {};
  let es: EventSource | null = null,
    stop = false,
    timer = 0;
  const open = () => {
    if (stop || !auth.get()) return;
    es = new EventSource(`${API}/admin/events?token=${encodeURIComponent(auth.get())}`);
    es.onmessage = (m) => {
      let e: OrderEvent | null = null;
      try {
        e = JSON.parse(m.data) as OrderEvent;
      } catch {
        /* ping */
      }
      onChange(e);
    };
    es.onerror = () => {
      es?.close();
      timer = window.setTimeout(open, 5000);
    };
  };
  open();
  return () => {
    stop = true;
    clearTimeout(timer);
    es?.close();
  };
}
