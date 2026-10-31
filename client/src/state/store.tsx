import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type CartLineInput } from "@/services/api";
import type { Catalog, CustomerInfo, Order, Product, Variant } from "@/types";
import { shrink } from "@/utils/image";
import { storage } from "@/utils/storage";
import { toast } from "@/utils/toast";

export type Sheet = "cart" | "pick" | "orders" | "photo" | null;
export type Sort = "default" | "asc" | "best" | "hot" | "desc";
export interface Pick {
  id: string;
  sel: number | null;
  qty: number;
}
export interface PhotoFile {
  file: File;
  url: string;
}
export type Overlay = { type: "bill"; o: Order; success?: boolean } | { type: "cel"; code: string; ord: Order } | null;

const EMPTY_INFO: CustomerInfo = { name: "", phone: "", note: "", addr: "" };

function useStoreState() {
  const [D, setD] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [country, setCountryState] = useState<string>(() => storage.get("mt_country", "Nhật"));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tất cả");
  const [sort, setSort] = useState<Sort>("default");
  const [cart, setCart] = useState<Record<string, number>>(() => storage.get("mt_cart", {}));
  const [remember, setRememberState] = useState<boolean>(() => storage.get("mt_remember", true));
  const [info, setInfoState] = useState<CustomerInfo>(() => ({ ...EMPTY_INFO, ...storage.get("mt_info", EMPTY_INFO) }));
  const [open, setOpenState] = useState<Sheet>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [MY, setMY] = useState<Order[]>([]);
  const [myReady, setMyReady] = useState(false);
  const [phFiles, setPhFiles] = useState<PhotoFile[]>([]);
  const [phName, setPhName] = useState("");
  const [phSending, setPhSending] = useState(false);
  const [phMsg, setPhMsg] = useState("");
  const [overlay, setOverlay] = useState<Overlay>(null);

  const loadCatalog = useCallback(() => {
    setLoadError("");
    api
      .catalog()
      .then((d) => {
        setD(d);
        setCountryState((c) => (d.countries.includes(c) ? c : d.countries[0] ?? "Nhật"));
      })
      .catch(() => setLoadError("Chưa tải được bảng giá. Bạn kiểm tra mạng rồi thử lại nhé."));
  }, []);

  const refreshMine = useCallback(() => {
    api
      .mine()
      .then((l) => {
        setMY(l);
        setMyReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCatalog();
    refreshMine();
    // Điền sẵn SĐT/địa chỉ đã dùng ở đơn trước nếu máy chưa lưu.
    api
      .me()
      .then((m) => setInfoState((i) => ({ ...i, phone: i.phone || m.phone, addr: i.addr || m.addr, name: i.name || m.name })))
      .catch(() => {});
    const onVis = () => document.visibilityState === "visible" && refreshMine();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Đang mở "Đơn của bạn": cập nhật trạng thái/giá báo mỗi 20 giây.
  useEffect(() => {
    if (open !== "orders") return;
    refreshMine();
    const t = setInterval(refreshMine, 20_000);
    return () => clearInterval(t);
  }, [open]);

  const byId = useCallback((id: string) => D?.products.find((p) => p.id === id), [D]);

  /** Khoá giỏ: `id` cho món thường, `id::index` cho từng tone. */
  const ck = useCallback(
    (k: string): { p: Product; vr: Variant | null } | null => {
      const s = String(k).split("::");
      const p = byId(s[0]);
      if (!p) return null;
      if (s.length < 2) return p.variants?.length ? null : { p, vr: null };
      const vr = (p.variants || [])[+s[1]];
      return vr ? { p, vr } : null;
    },
    [byId],
  );

  // Món của nước vừa bị khoá (hoặc đã ngừng bán) không còn trong bảng giá: bỏ khỏi giỏ và báo khách.
  useEffect(() => {
    if (!D) return;
    const gone = Object.keys(cart).filter((k) => !ck(k));
    if (!gone.length) return;
    const c = { ...cart };
    gone.forEach((k) => delete c[k]);
    setCart(c);
    storage.set("mt_cart", c);
    toast(`Đã bỏ ${gone.length} món đang tạm ngừng nhận đặt khỏi giỏ`);
  }, [D]);

  const entries = useMemo(() => Object.entries(cart).filter(([k]) => ck(k)), [cart, ck]);
  const cartCount = entries.reduce((a, [, n]) => a + n, 0);
  const cartTotal = entries.reduce((a, [k, n]) => a + ck(k)!.p.price * n, 0);
  const pendingCount = entries.reduce((a, [k, n]) => a + (ck(k)!.p.price ? 0 : n), 0);
  const prodCount = (id: string) => entries.reduce((a, [k, n]) => a + (k.split("::")[0] === id ? n : 0), 0);

  const saveCart = (c: Record<string, number>) => {
    setCart(c);
    storage.set("mt_cart", c);
  };
  const setQty = (id: string, n: number) => {
    const c = { ...cart };
    if (n <= 0) delete c[id];
    else c[id] = Math.min(n, 99);
    saveCart(c);
  };
  const setCountry = (c: string) => {
    setCountryState(c);
    setCat("Tất cả");
    storage.set("mt_country", c);
    setQ("");
  };
  const setOpen = (s: Sheet) => {
    setOpenState(s);
    setMsg("");
  };
  const startPick = (id: string) => {
    setPick({ id, sel: null, qty: 1 });
    setOpenState("pick");
  };
  const addPick = () => {
    const p = pick && byId(pick.id);
    if (!p || !pick || pick.sel == null) return;
    const k = p.id + "::" + pick.sel;
    saveCart({ ...cart, [k]: Math.min(99, (cart[k] || 0) + pick.qty) });
    const vn = p.variants[pick.sel].name;
    setOpenState(null);
    setPick(null);
    toast((p.price ? "Đã thêm tone " : "Đã lưu tone ") + vn + " vào giỏ");
  };
  const setInfo = (k: keyof CustomerInfo, v: string) => {
    setInfoState((i) => {
      const n = { ...i, [k]: v };
      if (remember) storage.set("mt_info", n);
      return n;
    });
  };
  const setRemember = (v: boolean) => {
    setRememberState(v);
    storage.set("mt_remember", v);
    if (v) storage.set("mt_info", info);
    else storage.remove("mt_info");
  };
  const clearCart = () => {
    saveCart({});
    setOpenState(null);
  };

  const orderText = () => {
    if (!D) return "";
    const fmtL = (n: number) => (Math.round(n) || 0).toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
    const lines = entries.map(([k, n]) => {
      const c = ck(k)!;
      return `• [${c.p.country || "Nhật"}] ${c.p.name}${c.vr ? " – " + c.vr.name : ""} × ${n} = ${c.p.price ? fmtL(c.p.price * n) : "chờ báo giá"}`;
    });
    const i = info;
    return `ĐƠN ĐẶT HÀNG – ${D.store}\n${i.name ? "Tên: " + i.name + "\n" : ""}${i.phone ? "SĐT: " + i.phone + "\n" : ""}${i.addr ? "Địa chỉ: " + i.addr + "\n" : ""}\n${lines.join("\n")}\n\nTạm tính: ${fmtL(cartTotal)}${i.note ? "\nGhi chú: " + i.note : ""}`;
  };

  const sendOrder = async () => {
    const i = info;
    if (!i.phone.trim() || !(i.addr || "").trim()) {
      toast("Bạn điền số điện thoại và địa chỉ nhé");
      return;
    }
    const items: CartLineInput[] = entries.map(([k, qty]) => {
      const [productId, v] = k.split("::");
      return v === undefined ? { productId, qty } : { productId, variant: +v, qty };
    });
    if (!items.length) return;
    setSending(true);
    setMsg("");
    try {
      const order = await api.createOrder({ name: i.name.trim() || undefined, phone: i.phone.trim(), addr: i.addr.trim(), note: i.note.trim() || undefined, items });
      setMY((l) => [order, ...l]);
      saveCart({});
      if (!remember) setInfoState(EMPTY_INFO);
      setOpenState(null);
      setOverlay({ type: "bill", o: order, success: true });
    } catch (e) {
      setMsg((e as Error).message || "Chưa gửi được đơn, bạn thử lại nhé.");
    } finally {
      setSending(false);
    }
  };

  const addPhotos = (fs: File[]) => {
    const room = 6 - phFiles.length;
    if (fs.length > room) toast("Tối đa 6 ảnh mỗi lần gửi");
    setPhFiles((l) => [...l, ...fs.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setPhMsg("");
  };
  const removePhoto = (i: number) =>
    setPhFiles((l) => {
      const f = l[i];
      if (f) URL.revokeObjectURL(f.url);
      return l.filter((_, k) => k !== i);
    });

  const sendPhoto = async () => {
    if (!phFiles.length) return toast("Bạn chọn ít nhất 1 ảnh nhé");
    if (!phName.trim()) return toast("Bạn nhập tên sản phẩm nhé");
    setPhSending(true);
    setPhMsg("");
    try {
      const photos: string[] = [];
      for (const f of phFiles) photos.push((await api.upload(await shrink(f.file))).url);
      const r = await api.createRequest({
        name: info.name.trim() || undefined,
        phone: info.phone.trim() || undefined,
        addr: info.addr.trim() || undefined,
        product: phName.trim(),
        photos,
      });
      setMY((l) => [r, ...l]);
      phFiles.forEach((f) => URL.revokeObjectURL(f.url));
      setPhFiles([]);
      setPhName("");
      setOpenState(null);
      setOverlay({ type: "cel", code: r.code, ord: r });
    } catch (e) {
      const m = (e as Error).message;
      setPhMsg(/too large|quá lớn|File too large/i.test(m) ? "Ảnh quá lớn, bạn chọn ảnh khác nhé." : `Chưa gửi được ảnh. Bạn thử lại hoặc gửi qua Zalo/Messenger cho ${D?.store} nhé.`);
    } finally {
      setPhSending(false);
    }
  };

  const markPaid = async (o: Order) => {
    try {
      const u = await api.markPaid(o.code);
      setMY((l) => l.map((x) => (x.code === o.code ? u : x)));
      return true;
    } catch {
      toast("Chưa ghi nhận được, bạn thử lại nhé");
      return false;
    }
  };

  // Cuộn nội dung sheet không đẩy trang phía sau.
  const scrollY = useRef(0);
  useEffect(() => {
    const on = !!open || !!overlay;
    if (on) scrollY.current = window.scrollY;
    document.body.style.overflow = on ? "hidden" : "";
  }, [open, overlay]);

  return {
    D, loadError, loadCatalog, byId, ck,
    country, setCountry, q, setQ, cat, setCat, sort, setSort,
    cart, entries, cartCount, cartTotal, pendingCount, prodCount, setQty, clearCart, orderText,
    remember, setRemember, info, setInfo,
    open, setOpen, pick, setPick, startPick, addPick,
    msg, sending, sendOrder,
    showPaid, setShowPaid, MY, myReady, refreshMine, markPaid,
    phFiles, addPhotos, removePhoto, phName, setPhName, phSending, phMsg, sendPhoto,
    overlay, setOverlay,
  };
}

export type Store = ReturnType<typeof useStoreState>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreState()}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore ngoài StoreProvider");
  return s;
}
