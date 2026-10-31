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

/** Mã BIN Napas theo tên ngân hàng: ô "Ngân hàng" trong Cài đặt chỉ cần gõ tên. */
const BINS: [string, string[]][] = [
  ["970436", ["vietcombank", "vcb", "ngoaithuong"]],
  ["970415", ["vietinbank", "ctg", "congthuong"]],
  ["970418", ["bidv", "dautuvaphattrien"]],
  ["970405", ["agribank", "nongnghiep"]],
  ["970407", ["techcombank", "tcb", "kythuong"]],
  ["970422", ["mbbank", "mb", "quandoi"]],
  ["970416", ["acb", "achau"]],
  ["970432", ["vpbank", "vietnamthinhvuong"]],
  ["970423", ["tpbank", "tienphong"]],
  ["970403", ["sacombank", "stb", "saigonthuongtin"]],
  ["970437", ["hdbank", "hdb"]],
  ["970441", ["vib", "quocte"]],
  ["970443", ["shb", "saigonhanoi"]],
  ["970431", ["eximbank", "eib"]],
  ["970426", ["msb", "maritime", "hanghai"]],
  ["970448", ["ocb", "phuongdong"]],
  ["970440", ["seabank", "dongnama"]],
  ["970449", ["lpbank", "lienvietpostbank", "lienviet", "locphat"]],
  ["970428", ["namabank", "nama"]],
  ["970409", ["bacabank", "baca"]],
  ["970425", ["abbank", "anbinh"]],
  ["970427", ["vietabank", "vieta"]],
  ["970419", ["ncb", "quocdan"]],
  ["970412", ["pvcombank", "daichung"]],
  ["970452", ["kienlongbank", "kienlong"]],
  ["970429", ["scb", "saigon"]],
  ["970400", ["saigonbank", "saigoncongthuong"]],
  ["970438", ["baovietbank", "baoviet"]],
  ["970430", ["pgbank", "xangdau"]],
  ["970433", ["vietbank", "vietnamthuongtin"]],
  ["970406", ["dongabank", "donga"]],
  ["970408", ["gpbank", "daukhitoancau"]],
  ["970414", ["oceanbank", "daiduong"]],
  ["970454", ["bvbank", "vietcapitalbank", "vietcapital", "banviet"]],
  ["546034", ["cake", "cakebyvpbank"]],
  ["546035", ["ubank"]],
  ["963388", ["timo"]],
  ["970424", ["shinhan", "shinhanbank"]],
  ["970457", ["woori", "wooribank"]],
  ["970439", ["publicbank"]],
  ["458761", ["hsbc"]],
  ["970458", ["uob"]],
  ["970410", ["standardchartered"]],
  ["422589", ["cimb"]],
  ["970434", ["indovina", "ivb"]],
  ["668888", ["kbank", "kasikorn"]],
];

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(nganhang|nh|tmcp|nganhangtmcp)+/, "");

/** "Vietcombank", "NH Ngoại Thương", "MB" → "970436" / "970422"; không nhận ra thì rỗng. */
export function binOf(bankName: string) {
  const k = key(bankName || "");
  if (!k) return "";
  for (const [bin, names] of BINS) if (names.some((n) => k === n)) return bin;
  for (const [bin, names] of BINS) if (names.some((n) => n.length >= 5 && (k.startsWith(n) || k.includes(n)))) return bin;
  return "";
}
