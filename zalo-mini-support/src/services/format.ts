import type { Order } from "@/types";

export const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

export function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

/** Nhãn trạng thái ngắn cho danh sách và chi tiết đơn. */
export function stateLabel(o: Pick<Order, "kind" | "status" | "paid">) {
  if (o.status === "cancelled") return "Đã huỷ";
  if (o.status === "pending") return o.kind === "request" ? "Chờ báo giá" : "Chờ xác nhận";
  return o.paid ? "Đã chuyển khoản" : "Đã xác nhận";
}

export function totalLabel(o: Pick<Order, "total">) {
  return o.total ? money(o.total) : "Chờ báo giá";
}
