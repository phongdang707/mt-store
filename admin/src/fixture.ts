/**
 * Chế độ dữ liệu mẫu (`VITE_FIXTURE=1 npm run dev`): API giả chạy trong trình duyệt,
 * dữ liệu giống canvas thiết kế (Ngọc Anh, Thu Hà, MT482931…) để xem và chụp so với thiết kế
 * mà không cần server / MongoDB. Sản phẩm + ảnh lấy từ `server/seed` (vite.config phục vụ ở /__seed).
 * Không bao giờ được nạp trong bản build thật (api.ts chỉ import động khi có cờ).
 */
import type { Badges, InvoiceVia, Order, OrderItem, Product, Settings } from "./types";

type Raw = Omit<Product, "variants" | "img"> & { img: string; variants?: { name: string; img: string }[] };

const IMG = (f: string) => (f ? (/^(https?:|data:|blob:|\/)/.test(f) ? f : "/__seed/images/" + f) : "");
const MIN = 60e3,
  HOUR = 60 * MIN,
  DAY = 24 * HOUR;

let products: Product[] = [];
let orders: Order[] = [];
let settings: Settings;
let ready: Promise<void> | null = null;

function recompute(o: Order) {
  o.subtotal = o.items.length ? o.items.reduce((a, x) => a + x.price * x.qty, 0) : o.quoteTotal;
  if (o.shipBase !== null && o.shipBase !== undefined) o.shippingFee = o.freeShipFrom && o.subtotal >= o.freeShipFrom ? 0 : o.shipBase;
  o.total = o.subtotal ? o.subtotal + o.shippingFee : 0;
  const last = o.invoice.sends.at(-1);
  o.invoiceStatus = o.status !== "confirmed" ? null : !last ? "new" : o.invoice.version > last.version ? "changed" : "sent";
  o.updatedAt = new Date().toISOString();
}
const touch = (o: Order, msg?: string) => {
  if (o.status !== "confirmed") return;
  o.invoice.version += 1;
  if (msg) o.invoice.log.push({ at: new Date().toISOString(), msg });
};
const label = (i: OrderItem) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".") + "đ";

function item(id: string, qty: number, variant: number | null = null, price?: number): OrderItem {
  const p = products.find((x) => x.id === id)!;
  const v = variant !== null ? p.variants[variant] : null;
  return { productId: p.id, variant, variantName: v?.name ?? "", name: p.name, country: p.country, img: v?.img || p.img, price: price ?? p.price, qty, addedLater: false };
}

function order(o: Partial<Order> & { code: string; name: string; ageMs: number }): Order {
  const created = new Date(Date.now() - o.ageMs).toISOString();
  const r: Order = {
    id: o.code,
    kind: o.code.startsWith("TH") ? "request" : "order",
    token: "tk" + o.code,
    avatar: "",
    phone: "",
    addr: "",
    note: "",
    product: "",
    photos: [],
    items: [],
    quoteTotal: 0,
    shippingFee: settings.shippingFee,
    shipBase: settings.shippingFee,
    freeShipFrom: settings.freeShipFrom,
    subtotal: 0,
    total: 0,
    status: "pending",
    paid: false,
    createdAt: created,
    updatedAt: created,
    invoice: { version: 0, sends: [], log: [] },
    invoiceStatus: null,
    ...o,
  } as Order;
  if (r.status === "confirmed" && !r.confirmedAt) r.confirmedAt = created;
  recompute(r);
  return r;
}

async function load() {
  const cat = (await (await fetch("/__seed/catalog.json")).json()) as { products: Raw[]; cats: string[]; bank: Settings["bank"] };
  products = cat.products.map((p, i) => ({
    id: p.id,
    name: p.name,
    cat: p.cat,
    price: p.price || 0,
    market: p.market || 0,
    country: p.country,
    img: IMG(p.img),
    variants: (p.variants || []).map((v) => ({ name: v.name, img: IMG(v.img) })),
    vlabel: p.vlabel || "",
    link: p.link || "",
    hot: !!p.hot || p.id === "p1" || p.id === "k9",
    best: !!p.best || p.id === "ky_sonque" || p.id === "p13",
    soldout: !!p.soldout || p.id === "p16",
    updatedAt: new Date(Date.now() - (i % 5) * DAY - 2 * DAY).toISOString(),
  }));
  settings = {
    store: "MT store",
    subtitle: "HÀNG XÁCH TAY",
    logo: "",
    tagline: "Hàng xách tay Nhật · Hàn · Úc",
    cats: cat.cats,
    countries: ["Nhật"],
    markets: [
      { key: "Nhật", open: true, fly: "12/11", until: "08/11" },
      { key: "Hàn", open: false, fly: "", until: "" },
      { key: "Úc", open: false, fly: "", until: "" },
      { key: "Trung", open: false, fly: "", until: "" },
    ],
    bank: { bank: "Vietcombank", bin: "970436", acc: "1019281212", name: "NGUYEN THI MAI" },
    qr: "",
    zalo: "0912345678",
    messenger: "",
    shippingFee: 30000,
    freeShipFrom: 0,
    orderNote: "",
    prefs: { notiOrder: true, notiFind: true, hideRev: false },
    storefrontUrl: "",
  };
  const m1 = (d: number) => new Date().getDate() * DAY + d * DAY; // về tháng trước
  orders = [
    order({ code: "MT482931", name: "Ngọc Anh", phone: "0912 345 678", addr: "66 Nguyễn Văn Công, Gò Vấp, TP.HCM", ageMs: 12 * MIN, items: [item("p1", 1), item("ky_sonque", 2, 1)] }),
    order({ code: "MT482915", name: "Thu Hà", phone: "0987 112 233", addr: "24 Lê Văn Sỹ, Phú Nhuận, TP.HCM", ageMs: 40 * MIN, note: "Lấy giúp mình date xa nha shop", items: [item("cm_cream", 1, 1, 0), item("sa_toneup", 2)] }),
    order({ code: "MT482877", name: "Bảo Trâm", phone: "0938 667 120", addr: "9 Nguyễn Trãi, Q.5, TP.HCM", ageMs: 2 * HOUR + 19 * MIN, items: [item("p13", 2), item("p15", 1)] }),
    order({ code: "MT482850", name: "Quốc Huy", phone: "0971 220 456", addr: "45 Hoàng Diệu, Q.4, TP.HCM", ageMs: 3 * HOUR + 30 * MIN, status: "confirmed", items: [item("k9", 1, null, 370000)] }),
    order({ code: "MT482811", name: "Lan Phương", phone: "0909 812 377", addr: "210 Cách Mạng Tháng 8, Q.3, TP.HCM", ageMs: 5 * HOUR + 8 * MIN, status: "confirmed", items: [item("k1", 6)] }),
    order({ code: "MT479120", name: "Thảo Vy", phone: "0932 118 640", addr: "17 Nguyễn Đình Chiểu, Q.3, TP.HCM", ageMs: m1(3), status: "confirmed", items: [item("p13", 1), item("p1", 2), item("k9", 2, null, 370000)], invoice: { version: 0, sends: [{ version: 0, via: "zalo", at: new Date(Date.now() - m1(3) + 42 * MIN).toISOString() }], log: [] } }),
    order({ code: "MT478844", name: "Gia Hân", phone: "0905 447 219", addr: "8 Võ Văn Tần, Q.3, TP.HCM", ageMs: m1(12), status: "confirmed", items: [item("k1", 12), item("p15", 2)], invoice: { version: 0, sends: [{ version: 0, via: "zalo", at: new Date(Date.now() - m1(12) + 85 * MIN).toISOString() }], log: [] } }),
    order({ code: "MT478512", name: "Đức Minh", phone: "0977 302 118", addr: "91 Lê Lợi, Q.1, TP.HCM", ageMs: m1(25), status: "confirmed", items: [item("ky_sonque", 3, 2)] }),
    order({ code: "MT475330", name: "Khánh Linh", phone: "0918 774 302", addr: "33 Hai Bà Trưng, Q.1, TP.HCM", ageMs: m1(37), status: "confirmed", items: [item("p5", 1)] }),
    order({ code: "MT475101", name: "Phương Anh", phone: "0939 650 881", addr: "120 Nguyễn Thị Minh Khai, Q.3, TP.HCM", ageMs: m1(52), status: "confirmed", items: [item("p13", 3)] }),
    order({ code: "TH0218", name: "Minh Thư", phone: "0903 554 210", addr: "118 Trần Hưng Đạo, Q.1, TP.HCM", ageMs: 1 * HOUR + 5 * MIN, product: "Giày Onitsuka Tiger Mexico 66, size 38, màu vàng", photos: [IMG("ln_onitsuka.jpg"), IMG("ln_onitsuka.jpg")], note: "Cần trước 20/11 để làm quà sinh nhật" }),
    order({ code: "TH0216", name: "Hoàng Yến", phone: "0918 230 775", addr: "52 Phan Xích Long, Phú Nhuận, TP.HCM", ageMs: 4 * HOUR + 20 * MIN, product: "Áo Uniqlo AIRism cổ tròn nữ, size M, 2 màu trắng và đen", photos: [IMG("ln_uniqlo.jpg")] }),
    order({ code: "TH0211", name: "Quốc Huy", phone: "0971 220 456", addr: "45 Hoàng Diệu, Q.4, TP.HCM", ageMs: 1 * DAY + 2 * HOUR, status: "confirmed", product: "Áo khoác Uniqlo Pocketable Parka nam, size L, màu xanh navy", photos: [IMG("ln_uniqlo.jpg"), IMG("ln_uniqlo.jpg"), IMG("ln_uniqlo.jpg")], quoteTotal: 650000 }),
  ];
}

class FixtureError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const find = (code: string) => {
  const o = orders.find((x) => x.code === code);
  if (!o) throw new FixtureError("Không tìm thấy đơn " + code, 404);
  return o;
};
const save = (o: Order) => (recompute(o), structuredClone(o));
const ym = (iso: string) => new Date(new Date(iso).getTime() + 7 * HOUR).toISOString().slice(0, 7);

export async function handle<T>(method: string, path: string, body?: unknown): Promise<T> {
  ready ??= load();
  await ready;
  await new Promise((r) => setTimeout(r, 60));
  const [p, qs] = path.split("?");
  const q = new URLSearchParams(qs || "");
  const b = (body || {}) as Record<string, unknown>;
  const R = (v: unknown) => structuredClone(v) as T;
  let m: RegExpMatchArray | null;

  if (p === "/auth/login") return R({ token: "fixture", admin: { email: String(b.email || "chushop@gmail.com"), name: "Chủ shop" } });
  if (p === "/auth/me") return R({ email: "chushop@gmail.com", name: "Chủ shop" });
  if (p === "/auth/password") {
    if (!b.current) throw new FixtureError("Mật khẩu hiện tại chưa đúng", 400);
    return null as T;
  }
  if (p === "/admin/badges") {
    const bd: Badges = {
      pendingOrders: orders.filter((o) => o.kind === "order" && o.status === "pending").length,
      pendingRequests: orders.filter((o) => o.kind === "request" && o.status === "pending").length,
      products: products.length,
      unsentInvoices: orders.filter((o) => o.invoiceStatus && o.invoiceStatus !== "sent").length,
    };
    return R(bd);
  }
  if (p === "/admin/orders/months") return R([...new Set(orders.map((o) => ym(o.createdAt)))].sort().reverse());
  if (p === "/admin/orders" && method === "GET") {
    const kind = q.get("kind"),
      month = q.get("month"),
      status = q.get("status");
    return R(
      orders
        .filter((o) => (!kind || o.kind === kind) && (!month || ym(o.createdAt) === month) && (!status || o.status === status))
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    );
  }
  if ((m = p.match(/^\/admin\/orders\/(\w+)\/(confirm|unconfirm)$/))) {
    const o = find(m[1]);
    o.status = m[2] === "confirm" ? "confirmed" : "pending";
    o.confirmedAt = o.status === "confirmed" ? new Date().toISOString() : undefined;
    return R(save(o));
  }
  if ((m = p.match(/^\/admin\/orders\/(\w+)\/send$/))) {
    const o = find(m[1]);
    o.invoice.sends.push({ version: o.invoice.version, via: b.via as InvoiceVia, at: new Date().toISOString() });
    return R(save(o));
  }
  if ((m = p.match(/^\/admin\/orders\/(\w+)\/items$/))) {
    const o = find(m[1]);
    const it = item(String(b.productId), Number(b.qty) || 1, b.variant === undefined || b.variant === null ? null : Number(b.variant));
    const same = o.items.find((i) => i.productId === it.productId && i.variant === it.variant);
    if (same) {
      touch(o, `Khách thêm ${label(same)} (${same.qty} → ${same.qty + it.qty})`);
      same.qty += it.qty;
    } else {
      it.addedLater = o.status === "confirmed";
      o.items.push(it);
      touch(o, `Khách thêm ${label(it)}`);
    }
    return R(save(o));
  }
  if ((m = p.match(/^\/admin\/orders\/(\w+)\/items\/(\d+)$/))) {
    const o = find(m[1]);
    const idx = +m[2];
    const it = o.items[idx];
    if (!it) throw new FixtureError("Không có món này trong đơn", 404);
    if (method === "DELETE" || b.qty === 0) {
      if (o.items.length === 1) throw new FixtureError("Đơn phải còn ít nhất 1 món", 400);
      o.items.splice(idx, 1);
      touch(o, `Khách bỏ ${label(it)}`);
      return R(save(o));
    }
    if (typeof b.price === "number" && b.price !== it.price) {
      it.price = b.price;
      touch(o, `Cập nhật giá ${label(it)}: ${b.price ? fmt(b.price) : "chờ báo giá"}`);
    }
    if (typeof b.qty === "number" && b.qty !== it.qty) {
      touch(o, `Khách ${b.qty > it.qty ? "thêm" : "bớt"} ${label(it)} (${it.qty} → ${b.qty})`);
      it.qty = b.qty;
    }
    return R(save(o));
  }
  if ((m = p.match(/^\/admin\/orders\/(\w+)$/))) {
    const o = find(m[1]);
    if (method === "PATCH") {
      if (typeof b.quoteTotal === "number") o.quoteTotal = b.quoteTotal;
      if (typeof b.shippingFee === "number") o.shippingFee = o.shipBase = b.shippingFee;
      touch(o);
      return R(save(o));
    }
    return R(o);
  }
  if (p === "/admin/products" && method === "GET") return R(products);
  if (p === "/admin/products" && method === "POST") {
    const np: Product = { id: "p" + Date.now().toString(36), name: "", cat: settings.cats[0] || "Khác", price: 0, market: 0, country: "Nhật", img: "", variants: [], vlabel: "", link: "", hot: false, best: false, soldout: false, ...(b as Partial<Product>), updatedAt: new Date().toISOString() };
    products.unshift(np);
    return R(np);
  }
  if ((m = p.match(/^\/admin\/products\/(.+)$/))) {
    const id = decodeURIComponent(m[1]);
    const i = products.findIndex((x) => x.id === id);
    if (i < 0) throw new FixtureError("Không tìm thấy sản phẩm " + id, 404);
    if (method === "DELETE") {
      products.splice(i, 1);
      return null as T;
    }
    products[i] = { ...products[i], ...(b as Partial<Product>), updatedAt: new Date().toISOString() };
    return R(products[i]);
  }
  if (p === "/admin/settings" && method === "GET") return R(settings);
  if (p === "/admin/settings" && method === "PATCH") {
    const u = b as Partial<Settings>;
    settings = { ...settings, ...u, bank: { ...settings.bank, ...(u.bank || {}) }, prefs: { ...settings.prefs, ...(u.prefs || {}) } };
    if (u.markets) settings.countries = u.markets.filter((x) => x.open).map((x) => x.key);
    return R(settings);
  }
  if (p === "/admin/uploads") {
    const f = (body as FormData).get("file") as Blob;
    return R({ url: URL.createObjectURL(f) });
  }
  if ((m = p.match(/^\/invoices\/(\w+)$/))) {
    const o = orders.find((x) => x.token === m![1]);
    if (!o) throw new FixtureError("Không tìm thấy hoá đơn", 404);
    return R({ order: o, shop: { store: settings.store, tagline: settings.tagline, logo: settings.logo, zalo: settings.zalo, bank: settings.bank, qr: settings.qr } });
  }
  throw new FixtureError(`Fixture chưa có ${method} ${path}`, 404);
}
