import { getAccessToken } from "zmp-sdk";
import { sdkReason } from "@/services/sdk-error";
import type { Desk, InvoiceStatus, Me, OrderBook } from "@/types";

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
    console.error("getAccessToken", error);
    // SDK reject không kèm lỗi khi trang không chạy trong Zalo (trình duyệt thường, localhost, IP mạng).
    if (error == null || localHost()) {
      throw new Error("Đang mở ngoài Zalo nên không có phiên. Mở Mini App trong ứng dụng Zalo để đăng nhập.");
    }
    const why = sdkReason(error);
    throw new Error(why ? `Zalo chưa cấp phiên: ${why}` : "Zalo chưa cấp phiên đăng nhập. Đóng Mini App rồi mở lại.");
  }
  if (!cached) throw new Error("Zalo chưa cấp phiên đăng nhập. Đóng Mini App rồi mở lại.");
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

export function orders() {
  return call<OrderBook>("/support/orders");
}

export function markSent(code: string) {
  return call<{ code: string; invoiceStatus: InvoiceStatus }>(`/support/invoices/${encodeURIComponent(code)}/send`, "POST");
}
