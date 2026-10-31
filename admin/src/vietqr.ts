import qrcode from "qrcode-generator";
import type { Bank } from "./types";

export function bankOf(b?: Partial<Bank>) {
  b = b || {};
  return {
    bank: String(b.bank || "").trim(),
    bin: String(b.bin || "").replace(/\D/g, ""),
    acc: String(b.acc || "").replace(/\D/g, ""),
    name: String(b.name || "").trim(),
  };
}

function crc16(t: string) {
  let c = 0xffff;
  for (let i = 0; i < t.length; i++) {
    c ^= t.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

/** Chuỗi VietQR (Napas) có sẵn số tiền và nội dung chuyển khoản. */
export function vietqr(bank: Partial<Bank> | undefined, amount: number, memo: string) {
  const b = bankOf(bank);
  if (!b.bin || !b.acc) return "";
  const f = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;
  const acct = f("00", b.bin) + f("01", b.acc);
  const mi = f("00", "A000000727") + f("01", acct) + f("02", "QRIBFTTA");
  const m = String(memo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, 25);
  const p =
    f("00", "01") +
    f("01", amount > 0 ? "12" : "11") +
    f("38", mi) +
    f("53", "704") +
    (amount > 0 ? f("54", String(Math.round(amount))) : "") +
    f("58", "VN") +
    (m ? f("62", f("08", m)) : "") +
    "6304";
  return p + crc16(p);
}

export function qrDataURL(payload: string) {
  if (!payload) return "";
  const q = qrcode(0, "M");
  q.addData(payload);
  q.make();
  return q.createDataURL(8, 2);
}
