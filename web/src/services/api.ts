import type { Catalog, InvoiceStatus, Order, SupportDesk } from "@/types";
import { storage } from "@/utils/storage";

const BASE = String(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "") + "/api";
const TOKEN_KEY = "mt_customer_token";
const MSG_KEY = "mt_login_msg";

const lost: Array<() => void> = [];

export function customerToken() {
  return storage.get<string>(TOKEN_KEY, "");
}

export function onSessionLost(fn: () => void) {
  lost.push(fn);
  return () => {
    const i = lost.indexOf(fn);
    if (i >= 0) lost.splice(i, 1);
  };
}

function dropSession() {
  storage.remove(TOKEN_KEY);
  lost.forEach((fn) => fn());
}

export function logout() {
  dropSession();
}

export function failLogin(message: string) {
  storage.set(MSG_KEY, message);
}

export function peekLoginMessage() {
  return storage.get(MSG_KEY, "");
}

export function clearLoginMessage() {
  storage.remove(MSG_KEY);
}

const EMPTY_PROFILE = { name: "", avatar: "" };
let profile: { name: string; avatar: string } | null = null;

export function rememberProfile(raw: { name?: string; avatar?: string }) {
  const name = (raw.name?.trim() || "").slice(0, 120);
  const avatar = (raw.avatar?.trim() || "").slice(0, 2000);
  if (!name && !avatar) return;
  profile = { name: profile?.name || name, avatar: profile?.avatar || avatar };
}

export interface ProfileStatus {
  hasData: boolean;
  name: string;
  avatar: string;
}

async function saveProfile() {
  const saved = await call<ProfileStatus>("POST", "/me/profile", {});
  if (!saved.name && !saved.avatar) return saved;
  profile = { name: saved.name, avatar: saved.avatar };
  rememberProfile(saved);
  return saved;
}

/** Lúc mở trang đã có phiên: server lấy tên và ảnh từ token Zalo đã lưu. */
export function prepareProfile() {
  if (!customerToken()) return Promise.resolve();
  return saveProfile()
    .then(() => undefined)
    .catch((e: unknown) => console.warn("prepareProfile", e));
}

export interface OrderPermit {
  ok: boolean;
  name: string;
  avatar: string;
}

export function permitForOrder(): Promise<OrderPermit> {
  if (!customerToken()) return Promise.resolve({ ok: false, name: "", avatar: "" });
  return saveProfile()
    .then((saved) => ({ ok: true, name: saved.name || "", avatar: saved.avatar || "" }))
    .catch((e: unknown) => {
      console.warn("permitForOrder", e);
      return { ok: true, name: profile?.name || "", avatar: profile?.avatar || "" };
    });
}

export function zaloProfile(_ask = false) {
  return Promise.resolve(profile ?? EMPTY_PROFILE);
}

export function deviceInfo() {
  let os = "";
  const language = navigator.language || "";
  const ua = navigator.userAgent;
  const android = ua.match(/Android\s+([\d.]+)/);
  const ios = ua.match(/OS (\d+(?:_\d+)*)/);
  if (android) os = "Android " + android[1];
  if (ios && /iPhone|iPad/.test(ua)) os = "iOS " + ios[1].replace(/_/g, ".");
  const build = ua.match(/;\s*([^;)]+?)\s+Build\//);
  const model = (build?.[1] || (/iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : "")).slice(0, 64);
  return { platform: "web", os: os.slice(0, 64), model, zaloVersion: "", language: language.slice(0, 16) };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const token = customerToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  if (res.status === 401 && auth) dropSession();
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const m = (data as { message?: string | string[] } | null)?.message;
    throw new ApiError(Array.isArray(m) ? m[0] : m || "Có lỗi xảy ra", res.status);
  }
  return data as T;
}

export async function beginZaloLogin() {
  const res = await call<{ url: string }>("GET", "/auth/zalo/start", undefined, false);
  if (!res?.url) throw new ApiError("Chưa mở được đăng nhập Zalo", 500);
  window.location.assign(res.url);
}

export async function finishLogin(code: string, state: string) {
  const res = await call<{ token: string }>("POST", "/auth/zalo/exchange", { code, state }, false);
  if (!res?.token) throw new ApiError("Đăng nhập Zalo chưa xong. Bạn thử lại nhé.", 401);
  storage.set(TOKEN_KEY, res.token);
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
  role?: "customer" | "support";
}

export const api = {
  zaloProfile,
  rememberProfile,
  prepareProfile,
  permitForOrder,
  beginZaloLogin,
  visit: (b: VisitInput) => call<null>("POST", "/me/visit", b),
  events: (events: ProductEventInput[]) => call<null>("POST", "/me/events", { events }),
  catalog: () => call<Catalog>("GET", "/catalog"),
  me: () => call<MeProfile>("GET", "/me"),
  mine: () => call<Order[]>("GET", "/orders/mine"),
  supportInvoices: () => call<SupportDesk>("GET", "/support/invoices"),
  supportSend: (code: string) => call<{ code: string; invoiceStatus: InvoiceStatus }>("POST", `/support/invoices/${encodeURIComponent(code)}/send`),
  createOrder: (b: { name?: string; avatar?: string; phone: string; addr: string; note?: string; items: CartLineInput[] }) =>
    call<Order>("POST", "/orders", b),
  createRequest: (b: { name?: string; avatar?: string; phone?: string; addr?: string; product: string; photos: string[] }) =>
    call<Order>("POST", "/requests", b),
  upload: (file: Blob) => {
    const fd = new FormData();
    fd.append("file", file, "photo.jpg");
    return call<{ url: string }>("POST", "/uploads", fd);
  },
};
