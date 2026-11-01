import type { SupportDesk, SupportInvoice } from "@/types";
import { fmt, memoOf } from "@/utils/format";

const MAX = 1000;

const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);

/** Tin gửi khách chỉ là tờ bill. Mọi đường link bị bỏ. */
function stripLinks(s: string) {
  return s
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bzalo\.me\/\S+/gi, "")
    .replace(/\/hd\/\S+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

export function billMessage(inv: SupportInvoice, shop: Pick<SupportDesk, "store" | "bank">) {
  const head = [`HOÁ ĐƠN ${inv.code}`];
  if (shop.store) head.push(shop.store);
  const lines = inv.items.map((i) => `• ${itemName(i)} × ${i.qty} = ${i.price ? fmt(i.price * i.qty) : "chờ báo giá"}`);
  const tail = [`Tạm tính: ${fmt(inv.subtotal)}`];
  const free = !!inv.shipBase && inv.shipBase > 0 && inv.shippingFee === 0;
  if (inv.shippingFee || free) tail.push(`Phí giao: ${inv.shippingFee ? fmt(inv.shippingFee) : "Miễn phí"}`);
  tail.push(`Tổng cộng: ${fmt(inv.total)}`);
  const bank = [shop.bank.bank, shop.bank.acc].filter(Boolean).join(" · ");
  if (bank) tail.push(`Ngân hàng: ${bank}`);
  if (shop.bank.name) tail.push(`Tên tài khoản: ${shop.bank.name}`);
  tail.push(`Nội dung chuyển khoản: ${memoOf(inv)}`);

  let used = lines;
  const join = (rows: string[]) => stripLinks([...head, ...rows, ...tail].join("\n"));
  let text = join(used);
  while (text.length > MAX && used.length) {
    used = used.slice(0, -1);
    text = join(used.length < lines.length ? [...used, "…"] : used);
  }
  if (text.length > MAX) text = text.slice(0, MAX).trim();
  return text;
}
