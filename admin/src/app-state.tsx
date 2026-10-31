import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, auth, setUnauthorizedHandler, subscribe, type OrderEvent } from "./api";
import type { Badges, Settings } from "./types";

/** Chấm đỏ trên mục điều hướng khi có đơn / yêu cầu mới (Cài đặt › Thông báo). */
export interface Alerts {
  orders: boolean;
  requests: boolean;
}

interface AppState {
  me: { email: string; name: string } | null;
  ready: boolean;
  badges: Badges;
  settings: Settings | null;
  /** Tăng mỗi khi server báo đơn thay đổi: trang theo dõi để tải lại. */
  tick: number;
  alerts: Alerts;
  clearAlert: (k: keyof Alerts) => void;
  refresh: () => void;
  setSettings: (s: Settings) => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AppState | null>(null);
const ZERO: Badges = { pendingOrders: 0, pendingRequests: 0, products: 0, unsentInvoices: 0 };

/** Tiếng "ting" ngắn khi có đơn mới (không cần file âm thanh). */
function chime() {
  try {
    const A = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new A();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* trình duyệt chặn âm thanh */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AppState["me"]>(null);
  const [ready, setReady] = useState(false);
  const [badges, setBadges] = useState<Badges>(ZERO);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tick, setTick] = useState(0);
  const [alerts, setAlerts] = useState<Alerts>({ orders: false, requests: false });
  const prefs = useRef(settings?.prefs);
  prefs.current = settings?.prefs;

  const logout = useCallback(() => {
    auth.clear();
    setMe(null);
  }, []);
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!auth.get()) return setReady(true);
    api
      .me()
      .then(setMe)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const clearAlert = useCallback((k: keyof Alerts) => setAlerts((a) => (a[k] ? { ...a, [k]: false } : a)), []);

  useEffect(() => {
    if (!me) return;
    api.settings().then(setSettings).catch(() => {});
    return subscribe((e: OrderEvent | null) => {
      if (e?.action === "created") {
        const p = prefs.current;
        const k = e.kind === "request" ? "requests" : "orders";
        if (k === "orders" ? p?.notiOrder !== false : p?.notiFind !== false) {
          setAlerts((a) => ({ ...a, [k]: true }));
          chime();
        }
      }
      if (e) refresh();
    });
  }, [me]);

  useEffect(() => {
    if (me) api.badges().then(setBadges).catch(() => {});
  }, [me, tick]);

  const login = async (email: string, password: string, remember: boolean) => {
    const r = await api.login(email, password, remember);
    auth.set(r.token, remember);
    setMe(r.admin);
  };

  return <Ctx.Provider value={{ me, ready, badges, settings, tick, alerts, clearAlert, refresh, setSettings, login, logout }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp ngoài AppProvider");
  return v;
}

/** Thông báo ngắn ở cuối màn hình. */
export function toast(t: string) {
  const d = document.createElement("div");
  d.className = "toast";
  d.setAttribute("role", "status");
  d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2400);
}

export function copyText(txt: string, msg: string) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => toast(msg))
    .catch(() => prompt(msg, txt));
}
