import type { Order } from "@/types";
import { openChat } from "zmp-sdk";

export function careMessage(store: string, name: string, code?: string) {
  const shop = store.trim() || "MT store";
  const who = name.trim() || "bạn";
  const about = code ? ` đơn ${code}` : "";
  return `Chào ${who}, ${shop} hỗ trợ${about}. Bạn cần mình giúp gì thêm không?`;
}

/** Lời nhắn điền sẵn theo trạng thái đơn. Nhân viên vẫn sửa được trong Zalo trước khi gửi. */
export function orderMessage(store: string, order: Pick<Order, "code" | "kind" | "status" | "name">) {
  const shop = store.trim() || "MT store";
  const who = order.name.trim() || "bạn";
  if (order.kind === "request") return `Chào ${who}, ${shop} nhắn về yêu cầu tìm hộ ${order.code} của bạn.`;
  if (order.status === "pending") return `Chào ${who}, ${shop} đã nhận đơn ${order.code}. Mình nhắn để xác nhận đơn với bạn.`;
  if (order.status === "cancelled") return `Chào ${who}, ${shop} nhắn về đơn ${order.code} đã huỷ.`;
  return `Chào ${who}, ${shop} nhắn về đơn ${order.code} của bạn.`;
}

function denied(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: number | string }).code;
  return code === -201 || code === "-201";
}

/** Mở chat cá nhân và điền sẵn lời nhắn. Khách nhận tin chỉ khi nhân viên bấm gửi trong Zalo. */
export async function openCareChat(id: string, message: string) {
  try {
    await openChat({ type: "user", id, message });
  } catch (error) {
    if (denied(error)) throw new Error("Bạn đã đóng cuộc trò chuyện.");
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") throw new Error("Mở Mini App trong Zalo để nhắn khách.");
    throw error instanceof Error ? error : new Error("Chưa mở được cuộc trò chuyện");
  }
}
