import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, api, deviceInfo, type CartLineInput, type MeProfile } from "@/services/api";
import { startPresence, track } from "@/services/track";
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

const cartKey = (id: string) => `mt_cart_${id}`;
const infoKey = (id: string) => `mt_info_${id}`;
const rememberKey = (id: string) => `mt_remember_${id}`;

/** Bản cũ không gắn user. Không đọc sang tài khoản đang mở. */
function dropSharedProfile() {
  storage.remove("mt_cart");
  storage.remove("mt_info");
  storage.remove("mt_remember");
}

function storedCart(id: string): Record<string, number> {
  const raw = storage.get<unknown>(cartKey(id), {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [key, qty] of Object.entries(raw)) {
    if (!key || typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) continue;
    out[key] = Math.min(99, Math.floor(qty));
  }
  return out;
}

function storedInfo(id: string): CustomerInfo | null {
  const raw = storage.get<Partial<CustomerInfo> | null>(infoKey(id), null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    name: String(raw.name || ""),
    phone: String(raw.phone || ""),
    note: String(raw.note || ""),
    addr: String(raw.addr || ""),
  };
}

function useStoreState() {
  const [D, setD] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState("");
  const [country, setCountryState] = useState<string>(() => storage.get("mt_country", "Nhật"));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tất cả");
  const [sort, setSort] = useState<Sort>("default");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [remember, setRememberState] = useState(true);
  const [info, setInfoState] = useState<CustomerInfo>(EMPTY_INFO);
  const userId = useRef("");
  const cartRef = useRef(cart);
  const infoRef = useRef(info);
  const rememberRef = useRef(remember);
  const dirtyCart = useRef(false);
  const dirtyInfo = useRef(false);
  cartRef.current = cart;
  infoRef.current = info;
  rememberRef.current = remember;

  const saveCart = useCallback((c: Record<string, number>) => {
    dirtyCart.current = true;
    cartRef.current = c;
    setCart(c);
    const id = userId.current;
    if (id) storage.set(cartKey(id), c);
  }, []);
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
  const [blocked, setBlocked] = useState(false);

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
    let stop = false;
    let listening = false;
    const onVis = () => document.visibilityState === "visible" && refreshMine();
    const start = () => {
      if (stop) return;
      void api.prepareProfile();
      startPresence();
      loadCatalog();
      refreshMine();
      document.addEventListener("visibilitychange", onVis);
      listening = true;
    };
    const bindAccount = (profile: MeProfile) => {
      api.rememberProfile({ name: profile.name, avatar: profile.avatar });
      const id = profile.id?.trim() ?? "";
      if (!id || userId.current === id) return;
      userId.current = id;
      if (dirtyCart.current) storage.set(cartKey(id), cartRef.current);
      else {
        const loaded = storedCart(id);
        cartRef.current = loaded;
        setCart(loaded);
      }
      if (dirtyInfo.current) {
        storage.set(rememberKey(id), rememberRef.current);
        if (rememberRef.current) storage.set(infoKey(id), infoRef.current);
        else storage.remove(infoKey(id));
        return;
      }
      const rememberOn = storage.get(rememberKey(id), true);
      rememberRef.current = rememberOn;
      setRememberState(rememberOn);
      const saved = rememberOn ? storedInfo(id) : null;
      if (!rememberOn) storage.remove(infoKey(id));
      const next = saved ?? (rememberOn ? { ...EMPTY_INFO, phone: profile.phone || "", addr: profile.addr || "" } : EMPTY_INFO);
      infoRef.current = next;
      setInfoState(next);
    };
    // Giỏ chung của máy không biết của ai. Xoá, không gán cho người vừa vào.
    dropSharedProfile();
    // Hồ sơ 403: cửa hàng đã chặn, không mở bảng giá.
    api
      .me()
      .then((profile) => {
        if (stop) return;
        bindAccount(profile);
        start();
      })
      .catch((e) => {
        if (stop) return;
        if (e instanceof ApiError && e.status === 403) setBlocked(true);
        else start();
      });
    return () => {
      stop = true;
      if (listening) document.removeEventListener("visibilitychange", onVis);
    };
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
    saveCart(c);
    toast(`Đã bỏ ${gone.length} món đang tạm ngừng nhận đặt khỏi giỏ`);
  }, [D, cart, ck, saveCart]);

  const entries = useMemo(() => Object.entries(cart).filter(([k]) => ck(k)), [cart, ck]);
  const cartCount = entries.reduce((a, [, n]) => a + n, 0);
  const cartTotal = entries.reduce((a, [k, n]) => a + ck(k)!.p.price * n, 0);
  const pendingCount = entries.reduce((a, [k, n]) => a + (ck(k)!.p.price ? 0 : n), 0);
  const prodCount = (id: string) => entries.reduce((a, [k, n]) => a + (k.split("::")[0] === id ? n : 0), 0);

  const setQty = (id: string, n: number) => {
    const productId = id.split("::")[0];
    const had = prodCount(productId) > 0;
    const c = { ...cart };
    if (n <= 0) delete c[id];
    else c[id] = Math.min(n, 99);
    saveCart(c);
    if (n > 0 && !had) track("cart", productId);
  };
  const setCountry = (c: string) => {
    setCountryState(c);
    setCat("Tất cả");
    storage.set("mt_country", c);
    setQ("");
  };
  const busy = useRef(false);
  const placing = useRef(false);
  const draft = useRef<{ phone: string; addr: string; note: string; items: CartLineInput[] } | null>(null);

  const keepZaloName = (name: string) => {
    const nextName = name.trim();
    if (!nextName || infoRef.current.name === nextName) return;
    const next = { ...infoRef.current, name: nextName };
    dirtyInfo.current = true;
    infoRef.current = next;
    setInfoState(next);
    const id = userId.current;
    if (id && rememberRef.current) storage.set(infoKey(id), next);
  };
  const setOpen = (s: Sheet) => {
    setOpenState(s);
    setMsg("");
    if (s === "cart") void api.syncCartProfile();
    else busy.current = false;
  };
  const startPick = (id: string) => {
    track("open", id);
    setPick({ id, sel: null, qty: 1 });
    setOpenState("pick");
  };
  const addPick = () => {
    const p = pick && byId(pick.id);
    if (!p || !pick || pick.sel == null) return;
    const had = prodCount(p.id) > 0;
    const k = p.id + "::" + pick.sel;
    saveCart({ ...cart, [k]: Math.min(99, (cart[k] || 0) + pick.qty) });
    if (!had) track("cart", p.id);
    const vn = p.variants[pick.sel].name;
    setOpenState(null);
    setPick(null);
    toast((p.price ? "Đã thêm tone " : "Đã lưu tone ") + vn + " vào giỏ");
  };
  const setInfo = (k: keyof CustomerInfo, v: string) => {
    dirtyInfo.current = true;
    const next = { ...infoRef.current, [k]: v };
    infoRef.current = next;
    setInfoState(next);
    const id = userId.current;
    if (id && rememberRef.current) storage.set(infoKey(id), next);
  };
  const setRemember = (v: boolean) => {
    dirtyInfo.current = true;
    rememberRef.current = v;
    setRememberState(v);
    const id = userId.current;
    if (!id) return;
    storage.set(rememberKey(id), v);
    if (v) storage.set(infoKey(id), infoRef.current);
    else storage.remove(infoKey(id));
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

  const finishOrder = async (load: () => Promise<{ name: string; avatar: string }>) => {
    if (placing.current) return;
    const d = draft.current;
    if (!d) {
      busy.current = false;
      return;
    }
    placing.current = true;
    setSending(true);
    setMsg("");
    try {
      const who = await load();
      const name = who.name.trim();
      const avatar = who.avatar.trim();
      keepZaloName(name);
      if (name || avatar) {
        await api
          .visit({ zaloName: name || undefined, avatar: avatar || undefined, ...deviceInfo(), seconds: 0 })
          .catch(() => {});
      }
      const order = await api.createOrder({
        name: name || undefined,
        avatar: avatar || undefined,
        phone: d.phone,
        addr: d.addr,
        note: d.note || undefined,
        items: d.items,
      });
      setMY((l) => [order, ...l]);
      saveCart({});
      if (!remember) {
        infoRef.current = EMPTY_INFO;
        setInfoState(EMPTY_INFO);
      }
      setOpenState(null);
      setOverlay({ type: "bill", o: order, success: true });
      draft.current = null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setBlocked(true);
      setMsg((e as Error).message || "Chưa gửi được đơn, bạn thử lại nhé.");
    } finally {
      placing.current = false;
      busy.current = false;
      setSending(false);
    }
  };

  const sendOrder = async () => {
    if (busy.current) return;
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
    draft.current = { phone: i.phone.trim(), addr: i.addr.trim(), note: i.note.trim(), items };
    busy.current = true;
    try {
      await api.waitCartProfile();
      await finishOrder(() => api.zaloProfile(false));
    } catch {
      await finishOrder(async () => ({ name: "", avatar: "" }));
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
      const who = await api.zaloProfile(false);
      const name = who.name.trim();
      const avatar = who.avatar.trim();
      keepZaloName(name);
      const r = await api.createRequest({
        name: name || undefined,
        avatar: avatar || undefined,
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
      if (e instanceof ApiError && e.status === 403) {
        setBlocked(true);
        setPhMsg(m);
      } else setPhMsg(/too large|quá lớn|File too large/i.test(m) ? "Ảnh quá lớn, bạn chọn ảnh khác nhé." : `Chưa gửi được ảnh. Bạn thử lại hoặc gửi qua Zalo/Messenger cho ${D?.store} nhé.`);
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
    overlay, setOverlay, blocked,
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
