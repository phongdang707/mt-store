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

const EMPTY_PROFILE = { name: "", avatar: "" };
/** Hồ sơ cứng của bản xem trước web. Không ghi vào đơn. */
const PREVIEW_ID = "3368637342326461234";
const PREVIEW_AVATAR = "https://h5.zdn.vn/static/images/avatar.png";
let profile: { name: string; avatar: string } | null = null;
let profileTask: Promise<{ name: string; avatar: string }> | null = null;
let checked = false;

function denied(e: unknown) {
  const code = (e as { code?: number })?.code;
  return code === -201 || code === -1401;
}

function pick(userInfo?: { id?: string; name?: string; avatar?: string } | null) {
  const name = (userInfo?.name?.trim() || "").slice(0, 120);
  const avatar = (userInfo?.avatar?.trim() || "").slice(0, 2000);
  const preview = userInfo?.id === PREVIEW_ID || (name === "User Name" && avatar === PREVIEW_AVATAR);
  if (preview) return EMPTY_PROFILE;
  return { name, avatar };
}

/** Ghi tên và ảnh đã có (từ `/me` hoặc lần đọc trước) để lần sau không xin quyền nữa. */
export function rememberProfile(raw: { name?: string; avatar?: string }) {
  const got = pick({ name: raw.name, avatar: raw.avatar });
  if (!got.name && !got.avatar) return;
  profile = {
    name: profile?.name || got.name,
    avatar: profile?.avatar || got.avatar,
  };
  checked = true;
}

/** `scope.userInfo` đã bật thì đọc hồ sơ, không mở hộp thoại. `null` khi chưa cấp quyền. */
async function readIfGranted() {
  try {
    const { authSetting } = await getSetting();
    if (authSetting["scope.userInfo"] !== true) return null;
  } catch (e) {
    console.warn("getSetting", e);
    return null;
  }
  try {
    const { userInfo } = await getUserInfo({ avatarType: "normal", autoRequestPermission: false });
    return pick(userInfo);
  } catch (e) {
    if (!denied(e)) console.warn("getUserInfo", e);
    return EMPTY_PROFILE;
  }
}

/** Popup quyền của Zalo (`MP_USER_AUTHORIZE`). Gọi ngay trong cú bấm, trước mọi `await`. */
function askZaloPermission() {
  return authorize({ scopes: ["scope.userInfo"] })
    .then((scopes) => scopes["scope.userInfo"] !== false)
    .catch((e: unknown) => {
      if (!denied(e)) console.warn("authorize", e);
      return false;
    });
}

/**
 * Họ tên và avatar lấy trên máy khách. Token mặc định chỉ có user ID.
 * Đã cấp `scope.userInfo` thì đọc im. Chưa cấp thì không tự mở popup ở đây.
 * Không xin số điện thoại hay vị trí.
 */
async function fetchProfile(ask: boolean) {
  const silent = await readIfGranted();
  if (silent && (silent.name || silent.avatar || !ask)) return silent;
  if (!ask) return EMPTY_PROFILE;
  if (!(await askZaloPermission())) return EMPTY_PROFILE;
  try {
    const { userInfo } = await getUserInfo({ avatarType: "normal", autoRequestPermission: false });
    return pick(userInfo);
  } catch (e) {
    if (denied(e)) return EMPTY_PROFILE;
    console.warn("getUserInfo", e);
    return EMPTY_PROFILE;
  }
}

async function scopeGranted() {
  try {
    const { authSetting } = await getSetting();
    return authSetting["scope.userInfo"] === true;
  } catch (e) {
    console.warn("getSetting", e);
    return false;
  }
}

export interface ProfileStatus {
  hasData: boolean;
  name: string;
  avatar: string;
}

/** `null` khi chưa hỏi server. `true` khi hồ sơ cũ chưa có tên và ảnh. */
let missing: boolean | null = null;
let granted = false;
let tapSync: Promise<void> | null = null;

async function saveProfile(raw: { name: string; avatar: string }) {
  if (!raw.name && !raw.avatar) return;
  profile = raw;
  checked = true;
  missing = false;
  const saved = await call<ProfileStatus>("POST", "/me/profile", {
    zaloName: raw.name || undefined,
    avatar: raw.avatar || undefined,
  });
  rememberProfile(saved);
}

/** Đợi lần sync của lần mở giỏ hiện tại, không xin quyền thêm. */
export function waitCartProfile() {
  return tapSync ?? Promise.resolve();
}

/** Lúc mở app, không bấm: chỉ ghi tên và ảnh nếu đã cấp quyền. Không mở popup. */
export function prepareProfile() {
  if (!inZalo) return Promise.resolve();
  return pullProfile(false, null);
}

/**
 * Bấm mở giỏ. Chưa có tên/ảnh thì `authorize` chạy ngay trong cú bấm,
 * đó là popup quyền của Zalo. Gọi sau một `await` thì Zalo không hiện hộp thoại.
 */
export function syncCartProfile() {
  if (!inZalo) return Promise.resolve();
  const prompt = missing !== false ? askZaloPermission() : null;
  const run = pullProfile(true, prompt).finally(() => {
    if (tapSync === run) tapSync = null;
  });
  tapSync = run;
  return run;
}

async function pullProfile(fromTap: boolean, prompt: Promise<boolean> | null) {
  try {
    const status = await call<ProfileStatus>("GET", "/me/profile");
    missing = !status.hasData;
    granted = await scopeGranted();
    if (!missing) {
      rememberProfile(status);
      if (!granted) return;
      const fresh = await readIfGranted();
      if (fresh && (fresh.name || fresh.avatar)) await saveProfile(fresh);
      return;
    }
    if (!fromTap) {
      if (!granted) return;
      const fresh = await readIfGranted();
      if (fresh && (fresh.name || fresh.avatar)) await saveProfile(fresh);
      return;
    }
    const allowed = prompt ? await prompt : granted;
    if (!allowed) return;
    granted = true;
    try {
      const { userInfo } = await getUserInfo({ avatarType: "normal", autoRequestPermission: false });
      const fresh = pick(userInfo);
      if (fresh.name || fresh.avatar) await saveProfile(fresh);
    } catch (e) {
      if (!denied(e)) console.warn("getUserInfo", e);
    }
  } catch (e) {
    console.warn("syncCartProfile", e);
  }
}

export function zaloProfile(ask = false): Promise<{ name: string; avatar: string }> {
  if (!inZalo) return Promise.resolve(EMPTY_PROFILE);
  if (profile?.name || profile?.avatar) return Promise.resolve(profile);
  if (profileTask && !ask) return profileTask;
  if (!ask && checked) return Promise.resolve(profile ?? EMPTY_PROFILE);
  const task = fetchProfile(ask)
    .then((got) => {
      if (got.name || got.avatar) {
        profile = got;
        checked = true;
      } else if (ask) checked = true;
      return got.name || got.avatar ? got : (profile ?? got);
    })
    .catch((e: unknown) => {
      console.warn("getUserInfo", e);
      if (denied(e)) checked = true;
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

export interface MeProfile {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  addr: string;
}

export const api = {
  zaloName,
  zaloProfile,
  rememberProfile,
  prepareProfile,
  syncCartProfile,
  waitCartProfile,
  visit: (b: VisitInput) => call<null>("POST", "/me/visit", b),
  events: (events: ProductEventInput[]) => call<null>("POST", "/me/events", { events }),
  catalog: () => call<Catalog>("GET", "/catalog", undefined, false),
  me: () => call<MeProfile>("GET", "/me"),
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
