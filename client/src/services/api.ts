import { authorize, getAccessToken, getSetting, getSystemInfo, getUserInfo } from "zmp-sdk/apis";
import type { Catalog, Order } from "@/types";
import { storage } from "@/utils/storage";

const BASE = String(import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "") + "/api";
export const inZalo = /zalo/i.test(navigator.userAgent);

let zaloToken: { value: string; exp: number } | null = null;

/** Trong Zalo: access token để server xác minh Zalo user ID. Ngoài Zalo (dev): ID ngẫu nhiên theo máy. */
async function authHeaders(fresh = false): Promise<Record<string, string>> {
  if (inZalo) {
    if (fresh) zaloToken = null;
    if (!zaloToken || zaloToken.exp < Date.now()) {
      try {
        const value = await getAccessToken();
        if (value) zaloToken = { value, exp: Date.now() + 30 * 60_000 };
      } catch (e) {
        console.warn("getAccessToken", e);
      }
    }
    if (!zaloToken) throw new ApiError("Chưa lấy được phiên Zalo. Bạn mở lại Mini App rồi thử lại nhé.", 401);
    return { "x-zalo-token": zaloToken.value };
  }
  let id = storage.get<string>("mt_dev_user", "");
  if (!id) storage.set("mt_dev_user", (id = "u" + Math.random().toString(36).slice(2, 14)));
  return { "x-dev-user": id };
}

const DENIED = "mt_zalo_userinfo_denied";
const EMPTY_PROFILE = { name: "", avatar: "" };
let profile: { name: string; avatar: string } | null = null;
let profileTask: Promise<{ name: string; avatar: string }> | null = null;
let checked = false;
let prompted = false;

function denied(e: unknown) {
  const code = (e as { code?: number })?.code;
  return code === -201 || code === -1401;
}

function pick(userInfo?: { name?: string; avatar?: string } | null) {
  return {
    name: (userInfo?.name?.trim() || "").slice(0, 120),
    avatar: (userInfo?.avatar?.trim() || "").slice(0, 2000),
  };
}

/**
 * Họ tên và avatar lấy trên máy khách. Token mặc định chỉ có user ID;
 * hai trường này cần khách cấp `scope.userInfo`. Server ở ngoài Việt Nam xin Graph API sẽ bị -501.
 * Chỉ hiện hộp thoại khi `ask` (lúc bấm gửi đơn). Lúc mở app chỉ đọc nếu đã cấp trước đó.
 */
async function fetchProfile(ask: boolean) {
  let allowed = false;
  try {
    const { authSetting } = await getSetting();
    allowed = authSetting["scope.userInfo"] === true;
  } catch (e) {
    console.warn("getSetting", e);
  }
  if (!allowed && !ask) return EMPTY_PROFILE;
  if (!allowed) {
    if (storage.get(DENIED, false) && prompted) return EMPTY_PROFILE;
    prompted = true;
    try {
      const scopes = await authorize({ scopes: ["scope.userInfo"] });
      allowed = scopes["scope.userInfo"] === true;
      if (!allowed) storage.set(DENIED, true);
    } catch (e) {
      if (denied(e)) {
        storage.set(DENIED, true);
        return EMPTY_PROFILE;
      }
      console.warn("authorize", e);
      const { userInfo } = await getUserInfo({ avatarType: "normal", autoRequestPermission: true });
      return pick(userInfo);
    }
  }
  if (!allowed) return EMPTY_PROFILE;
  const { userInfo } = await getUserInfo({ avatarType: "normal" });
  return pick(userInfo);
}

export function zaloProfile(ask = false): Promise<{ name: string; avatar: string }> {
  if (!inZalo) return Promise.resolve(EMPTY_PROFILE);
  if (profile?.name && profile.avatar) return Promise.resolve(profile);
  if (profileTask && !ask) return profileTask;
  if (!ask && checked) return Promise.resolve(profile ?? EMPTY_PROFILE);
  const task = fetchProfile(ask)
    .then((got) => {
      checked = true;
      if (got.name || got.avatar) {
        profile = got;
        storage.set(DENIED, false);
      }
      return profile ?? got;
    })
    .catch((e: unknown) => {
      console.warn("getUserInfo", e);
      if (denied(e)) {
        storage.set(DENIED, true);
        checked = true;
      }
      return profile ?? EMPTY_PROFILE;
    })
    .finally(() => {
      if (profileTask === task) profileTask = null;
    });
  profileTask = task;
  return task;
}

/** Tên Zalo. `ask` chỉ dùng lúc khách bấm gửi đơn. */
export async function zaloName(ask = false) {
  return (await zaloProfile(ask)).name;
}

/** Nền tảng và máy. Ngoài Zalo thì platform là web. */
export function deviceInfo() {
  let platform = "web";
  let zaloVersion = "";
  let language = navigator.language || "";
  let os = "";
  if (inZalo) {
    try {
      const s = getSystemInfo();
      platform = s.platform === "iOS" ? "ios" : s.platform === "android" ? "android" : "web";
      zaloVersion = s.zaloVersion || "";
      language = s.zaloLanguage || s.language || language;
      os = s.platform || "";
    } catch (e) {
      console.warn("getSystemInfo", e);
    }
  }
  const ua = navigator.userAgent;
  const android = ua.match(/Android\s+([\d.]+)/);
  const ios = ua.match(/OS (\d+(?:_\d+)*)/);
  if (!os && android) os = "Android " + android[1];
  if (!os && ios && /iPhone|iPad/.test(ua)) os = "iOS " + ios[1].replace(/_/g, ".");
  const build = ua.match(/;\s*([^;)]+?)\s+Build\//);
  const model = (build?.[1] || (/iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : "")).slice(0, 64);
  return { platform, os: os.slice(0, 64), model, zaloVersion: zaloVersion.slice(0, 32), language: language.slice(0, 16) };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, auth = true, retry = true): Promise<T> {
  const headers: Record<string, string> = auth ? await authHeaders() : {};
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  if (res.status === 401 && auth && retry && inZalo) {
    await authHeaders(true);
    return call(method, path, body, auth, false);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const m = (data as { message?: string | string[] } | null)?.message;
    throw new ApiError(Array.isArray(m) ? m[0] : m || "Có lỗi xảy ra", res.status);
  }
  return data as T;
}

export interface CartLineInput {
  productId: string;
  variant?: number;
  qty: number;
}

export interface VisitInput {
  zaloName?: string;
  avatar?: string;
  platform: string;
  os: string;
  model: string;
  zaloVersion: string;
  language: string;
  seconds: number;
}

export interface ProductEventInput {
  type: "view" | "open" | "cart";
  productId: string;
}

export const api = {
  zaloName,
  zaloProfile,
  visit: (b: VisitInput) => call<null>("POST", "/me/visit", b),
  events: (events: ProductEventInput[]) => call<null>("POST", "/me/events", { events }),
  catalog: () => call<Catalog>("GET", "/catalog", undefined, false),
  me: () => call<{ name: string; phone: string; addr: string }>("GET", "/me"),
  mine: () => call<Order[]>("GET", "/orders/mine"),
  createOrder: (b: { name?: string; avatar?: string; phone: string; addr: string; note?: string; items: CartLineInput[] }) =>
    call<Order>("POST", "/orders", b),
  createRequest: (b: { name?: string; avatar?: string; phone?: string; addr?: string; product: string; photos: string[] }) =>
    call<Order>("POST", "/requests", b),
  markPaid: (code: string) => call<Order>("POST", `/orders/${encodeURIComponent(code)}/paid`),
  upload: (file: Blob) => {
    const fd = new FormData();
    fd.append("file", file, "photo.jpg");
    return call<{ url: string }>("POST", "/uploads", fd);
  },
};
