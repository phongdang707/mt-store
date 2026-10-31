import { getAccessToken, getUserInfo } from "zmp-sdk/apis";
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
    if (zaloToken) return { "x-zalo-token": zaloToken.value };
  }
  let id = storage.get<string>("mt_dev_user", "");
  if (!id) storage.set("mt_dev_user", (id = "u" + Math.random().toString(36).slice(2, 14)));
  return { "x-dev-user": id };
}

let cachedZaloName = "";
let zaloNameDenied = false;

/**
 * Tên Zalo lấy trên máy khách. Server ở ngoài Việt Nam không xin được tên.
 * `ask` hiện hộp thoại quyền một lần. Khách từ chối thì để trống, không hỏi lại.
 */
export async function zaloName(ask = false): Promise<string> {
  if (!inZalo || cachedZaloName || zaloNameDenied) return cachedZaloName;
  try {
    const { userInfo } = await getUserInfo(ask ? { autoRequestPermission: true } : {});
    cachedZaloName = userInfo?.name?.trim() || "";
  } catch (e) {
    console.warn("getUserInfo", e);
    if ((e as { code?: number }).code === -201) zaloNameDenied = true;
  }
  return cachedZaloName;
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

export const api = {
  zaloName,
  catalog: () => call<Catalog>("GET", "/catalog", undefined, false),
  me: () => call<{ name: string; phone: string; addr: string }>("GET", "/me"),
  mine: () => call<Order[]>("GET", "/orders/mine"),
  createOrder: (b: { name?: string; phone: string; addr: string; note?: string; items: CartLineInput[] }) =>
    call<Order>("POST", "/orders", b),
  createRequest: (b: { name?: string; phone?: string; addr?: string; product: string; photos: string[] }) =>
    call<Order>("POST", "/requests", b),
  markPaid: (code: string) => call<Order>("POST", `/orders/${encodeURIComponent(code)}/paid`),
  upload: (file: Blob) => {
    const fd = new FormData();
    fd.append("file", file, "photo.jpg");
    return call<{ url: string }>("POST", "/uploads", fd);
  },
};
