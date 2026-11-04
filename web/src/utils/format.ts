export const fmt = (n: number) => (Math.round(n) || 0).toLocaleString("vi-VN").replace(/,/g, ".") + "đ";

/** Chuẩn hoá để tìm kiếm không dấu. */
export const norm = (s: unknown) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

export const nf = (n: unknown) => Number(n) || 0;

export const FLAG: Record<string, string> = { Nhật: "🇯🇵", Hàn: "🇰🇷", Úc: "🇦🇺" };
export const LABEL: Record<string, string> = { Nhật: "Nhật Bản", Hàn: "Hàn Quốc", Úc: "Úc" };
export const CAT_ICON: Record<string, string> = {
  "Mỹ phẩm": "💄",
  "Thời trang": "👟",
  "Thực phẩm chức năng": "💊",
  "Bánh kẹo": "🍬",
  "Thực phẩm": "🍱",
  "Đồ dùng": "🧴",
};

/** Mã chuyển khoản: mã đơn + SĐT (chỉ số). */
export const memoOf = (o: { code: string; phone?: string }) => o.code + " " + String(o.phone || "").replace(/\D/g, "");
