import type { Order } from "@/types";
import { getUserID, openChat } from "zmp-sdk";
import { sdkReason } from "@/services/sdk-error";

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

function codeOf(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as { code?: unknown }).code ?? "");
}

let selfId: Promise<string> | null = null;

/** User id của chính nhân viên trong cùng Zalo App. Lỗi thì bỏ qua kiểm tra. */
function myZaloId() {
  selfId ??= getUserID({}).then(
    (id) => id || "",
    () => "",
  );
  return selfId;
}

/** Mở chat cá nhân và điền sẵn lời nhắn. Khách nhận tin chỉ khi nhân viên bấm gửi trong Zalo. */
export async function openCareChat(id: string, message: string) {
  if (id && id === (await myZaloId())) {
    throw new Error("Đây là tài khoản Zalo của chính bạn. Zalo không mở chat với chính mình, hãy thử với đơn của khách khác.");
  }
  try {
    await openChat({ type: "user", id, message });
  } catch (error) {
    console.error("openChat", id, error);
    if (codeOf(error) === "-201") throw new Error("Bạn đã đóng cuộc trò chuyện.");
    const host = location.hostname;
    // SDK reject không kèm lỗi khi trang không chạy trong Zalo.
    if (error == null || host === "localhost" || host === "127.0.0.1") throw new Error("Mở Mini App trong Zalo để nhắn khách.");
    const why = sdkReason(error);
    throw new Error(why ? `Zalo không mở được chat: ${why}` : "Zalo không mở được chat với khách này.");
  }
}
