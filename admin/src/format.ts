/** 380000 → "380.000" */
export const dots = (n: number) => (Math.round(n) || 0).toLocaleString("vi-VN").replace(/,/g, ".");
export const fmt = (n: number) => dots(n) + "đ";

/** Ô nhập giá: bỏ ký tự lạ, chèn dấu chấm mỗi 3 số (giống thiết kế). */
export const dotsInput = (v: string) =>
  String(v || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** "95k", "95.000", "95000đ" → 95000 */
export function parseMoney(s: string) {
  s = String(s || "").trim().toLowerCase().replace(/\s/g, "");
  if (!s) return 0;
  const k = /k$/.test(s);
  s = s.replace(/k$/, "").replace(/đ|d|vnd/g, "");
  return k ? Math.round(parseFloat(s.replace(",", ".")) * 1000) || 0 : parseInt(s.replace(/[.,]/g, "")) || 0;
}

export const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

export const CN: Record<string, string> = { Nhật: "Nhật Bản", Hàn: "Hàn Quốc", Úc: "Úc", Trung: "Trung Quốc" };

/** Chữ cái tên (từ cuối) cho avatar mặc định: "Bảo Trâm" → "T". */
export const initialOf = (name: string) => (name || "K").trim().split(/\s+/).pop()!.charAt(0).toUpperCase();

const pad = (n: number) => String(n).padStart(2, "0");
export const ddmm = (d: Date) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
export const hhmm = (d: Date) => pad(d.getHours()) + ":" + pad(d.getMinutes());
/** "09:48 · 31/10" */
export const timeOf = (iso: string) => {
  const d = new Date(iso);
  return hhmm(d) + " · " + ddmm(d);
};
/** "12 phút", "1 giờ", "2 ngày", quá 7 ngày thì "28/09". */
export function ago(iso: string) {
  const d = new Date(iso),
    s = (Date.now() - +d) / 1000;
  if (s < 60) return "vừa xong";
  if (s < 3600) return Math.floor(s / 60) + " phút";
  if (s < 86400) return Math.floor(s / 3600) + " giờ";
  if (s < 604800) return Math.floor(s / 86400) + " ngày";
  return ddmm(d);
}
export const relUpdated = (iso?: string) => {
  if (!iso) return "";
  const a = ago(iso);
  return a === "vừa xong" ? "Cập nhật vừa xong" : /\//.test(a) ? "Cập nhật " + a : "Cập nhật " + a + " trước";
};

/** Tháng hiện tại theo giờ VN: "2026-10". */
export const thisMonth = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);

export const itemLabel = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
export const zaloOf = (p: string) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("84")) d = "0" + d.slice(2);
  return d.length >= 9 ? d : "";
};
