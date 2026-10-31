import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, auth, setUnauthorizedHandler, subscribe } from "./api";
import type { Badges, Settings } from "./types";

interface AppState {
  me: { email: string; name: string } | null;
  ready: boolean;
  badges: Badges;
  settings: Settings | null;
  /** Tăng mỗi khi server báo đơn thay đổi: trang theo dõi để tải lại. */
  tick: number;
  refresh: () => void;
  setSettings: (s: Settings) => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AppState | null>(null);
const ZERO: Badges = { pendingOrders: 0, pendingRequests: 0, products: 0, unsentInvoices: 0 };

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AppState["me"]>(null);
  const [ready, setReady] = useState(false);
  const [badges, setBadges] = useState<Badges>(ZERO);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tick, setTick] = useState(0);

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

  useEffect(() => {
    if (!me) return;
    api.settings().then(setSettings).catch(() => {});
    return subscribe(refresh);
  }, [me]);

  useEffect(() => {
    if (me) api.badges().then(setBadges).catch(() => {});
  }, [me, tick]);

  const login = async (email: string, password: string, remember: boolean) => {
    const r = await api.login(email, password, remember);
    auth.set(r.token, remember);
    setMe(r.admin);
  };

  return <Ctx.Provider value={{ me, ready, badges, settings, tick, refresh, setSettings, login, logout }}>{children}</Ctx.Provider>;
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
