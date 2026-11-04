import { getAccessToken } from "zmp-sdk";
import type { Desk, InvoiceStatus, Me } from "@/types";

const BASE = String(import.meta.env.VITE_API_URL || "https://mt-store.nhatrothongminh.click").replace(/\/+$/, "") + "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function localHost() {
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

let cached = "";

/** Access token của Mini App. Server xác minh bằng cùng App ID đã cấp zalo user id. */
export async function accessToken(force = false) {
  if (cached && !force) return cached;
  try {
    cached = (await getAccessToken()) || "";
  } catch (error) {
    cached = "";
    if (localHost()) throw new Error("Mở Mini App trong Zalo để đăng nhập.");
    throw error instanceof Error ? error : new Error("Chưa lấy được phiên Zalo");
  }
  if (!cached) throw new Error("Zalo chưa cấp phiên đăng nhập.");
  return cached;
}

async function call<T>(path: string, method = "GET"): Promise<T> {
  const headers = { "x-zalo-token": await accessToken() };
  const res = await fetch(BASE + path, { method, headers });
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (res.status === 401) cached = "";
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new ApiError(message || "Có lỗi xảy ra", res.status);
  }
  return data as T;
}

export function me() {
  return call<Me>("/me");
}

export function desk() {
  return call<Desk>("/support/invoices");
}

export function markSent(code: string) {
  return call<{ code: string; invoiceStatus: InvoiceStatus }>(`/support/invoices/${encodeURIComponent(code)}/send`, "POST");
}
