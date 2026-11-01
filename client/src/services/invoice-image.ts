import LOGO from "@/static/logo.svg?raw";
import type { SupportDesk, SupportInvoice } from "@/types";
import { fmt, memoOf, nf } from "@/utils/format";
import { bankOf, qrDataURL, vietqr } from "@/utils/vietqr";

const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
const freeShip = (o: { shipBase?: number | null; shippingFee: number }) => !!o.shipBase && o.shipBase > 0 && o.shippingFee === 0;

const W = 1200;
const M = 36;
const PAD = 48;
const L = M + PAD;
const R = W - M - PAD;
const CW = R - L;
const F = "'Be Vietnam Pro', system-ui, sans-serif";
const Q = "Quicksand, 'Be Vietnam Pro', sans-serif";

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((r) => {
    if (!src) return r(null);
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = src;
  });
}

async function readyFonts() {
  const fonts = document.fonts;
  if (!fonts?.load) return;
  try {
    await Promise.all([
      fonts.load("700 40px Quicksand"),
      fonts.load("700 28px 'Be Vietnam Pro'"),
      fonts.load("600 22px 'Be Vietnam Pro'"),
    ]);
    await fonts.ready;
  } catch {
    /* Ảnh vẫn vẽ được bằng font hệ thống. */
  }
}

type Ctx = CanvasRenderingContext2D;

function rounded(x: Ctx, X: number, Y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(X + rad, Y);
  x.arcTo(X + w, Y, X + w, Y + h, rad);
  x.arcTo(X + w, Y + h, X, Y + h, rad);
  x.arcTo(X, Y + h, X, Y, rad);
  x.arcTo(X, Y, X + w, Y, rad);
  x.closePath();
}

function wrap(x: Ctx, t: string, max: number, lines: number) {
  const words = String(t || "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (x.measureText(next).width > max && line) {
      out.push(line);
      line = word;
      if (out.length === lines) break;
    } else line = next;
  }
  if (line && out.length < lines) out.push(line);
  if (!out.length) out.push("");
  if (words.length && out.length === lines) {
    const used = out.join(" ").split(/\s+/).length;
    if (used < words.length) {
      let last = out[lines - 1];
      while (last.length > 1 && x.measureText(last + "…").width > max) last = last.slice(0, -1);
      out[lines - 1] = last.replace(/[.,;: ]+$/, "") + "…";
    }
  }
  return out;
}

function fit(x: Ctx, t: string, max: number) {
  if (x.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && x.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

function tracked(x: Ctx, text: string, px: number, py: number, gap: number, align: "left" | "right" | "center") {
  const chars = [...text];
  const widths = chars.map((ch) => x.measureText(ch).width);
  const total = widths.reduce((n, w) => n + w, 0) + gap * Math.max(0, chars.length - 1);
  let cx = align === "right" ? px - total : align === "center" ? px - total / 2 : px;
  const prev = x.textAlign;
  x.textAlign = "left";
  chars.forEach((ch, i) => {
    x.fillText(ch, cx, py);
    cx += widths[i] + gap;
  });
  x.textAlign = prev;
}

/** Ảnh hoá đơn PNG theo tờ trên trang quản lý: đầu trang, bảng món, chuyển khoản cạnh tổng. */
export async function invoiceImage(o: SupportInvoice, shop: Pick<SupportDesk, "store" | "tagline" | "logo" | "qr" | "bank">): Promise<Blob | null> {
  await readyFonts();
  const rows = o.items;
  let logo: HTMLImageElement | null = shop.logo ? await loadImg(shop.logo) : null;
  if (!logo) {
    try {
      let t = LOGO.replace(/currentColor/g, "#a3546a").match(/<svg[\s\S]*<\/svg>/)?.[0];
      if (t) {
        if (!/xmlns=/.test(t)) t = t.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        logo = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(t));
      }
    } catch {
      logo = null;
    }
  }
  const memo = memoOf(o);
  const payload = qrDataURL(vietqr(shop.bank, nf(o.total), memo));
  let qr: HTMLImageElement | null = payload ? await loadImg(payload) : null;
  if (!qr && shop.qr) qr = await loadImg(shop.qr);
  const thumbs = await Promise.all(rows.map((it) => (it.img ? loadImg(it.img) : Promise.resolve(null))));

  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = 1600 + rows.length * 180;
  const x = layer.getContext("2d");
  if (!x) return null;
  x.textBaseline = "top";

  const font = (weight: number, size: number, quick = false) => {
    x.font = `${weight} ${size}px ${quick ? Q : F}`;
  };

  let y = L;

  const logoW = 168;
  const logoH = logo ? logoW * (logo.height / logo.width || 0.61) : 0;
  const headH = Math.max(logoH, 108);
  if (logo) x.drawImage(logo, L, y + (headH - logoH) / 2, logoW, logoH);
  const nameX = L + (logo ? logoW + 22 : 0);
  const headMax = R - 300 - nameX;
  font(700, 34, true);
  x.fillStyle = "#a3546a";
  x.fillText(fit(x, shop.store || "MT store", headMax), nameX, y + 18);
  if (shop.tagline) {
    font(500, 22);
    x.fillStyle = "#7d6862";
    x.fillText(fit(x, shop.tagline, headMax), nameX, y + 62);
  }
  const date = new Date(o.createdAt || Date.now()).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  font(700, 40, true);
  x.fillStyle = "#3d3530";
  tracked(x, "HOÁ ĐƠN", R, y + 8, 5, "right");
  font(700, 24);
  x.fillStyle = "#a3546a";
  x.textAlign = "right";
  x.fillText("HĐ-" + o.code, R, y + 58);
  font(500, 22);
  x.fillStyle = "#7d6862";
  x.fillText("Ngày " + date, R, y + 90);
  x.textAlign = "left";
  y += headH + 32;

  const colW = (CW - 28) / 2;
  font(700, 28);
  const who = wrap(x, o.name || "Khách", colW - 48, 2);
  font(500, 24);
  const addr = wrap(x, o.addr || "—", colW - 48, 3);
  const infoH = 24 + Math.max(who.length * 36 + (o.phone ? 32 : 0), addr.length * 32 + 30) + 36;
  x.fillStyle = "#fdf6f3";
  rounded(x, L, y, CW, infoH, 20);
  x.fill();
  const iy = y + 20;
  font(700, 18);
  x.fillStyle = "#7d6862";
  tracked(x, "KHÁCH HÀNG", L + 24, iy, 1.2, "left");
  tracked(x, "GIAO ĐẾN", L + colW + 28, iy, 1.2, "left");
  font(700, 28);
  x.fillStyle = "#3d3530";
  who.forEach((line, i) => x.fillText(line, L + 24, iy + 30 + i * 36));
  if (o.phone) {
    font(500, 24);
    x.fillStyle = "#3d3530";
    x.fillText(o.phone, L + 24, iy + 30 + who.length * 36);
  }
  font(500, 24);
  x.fillStyle = "#3d3530";
  addr.forEach((line, i) => x.fillText(line, L + colW + 28, iy + 30 + i * 32));
  font(500, 20);
  x.fillStyle = "#7d6862";
  x.fillText("Từ đơn #" + o.code, L + colW + 28, iy + 30 + addr.length * 32 + 6);
  y += infoH + 32;

  const qtyW = 150;
  const unitW = 200;
  const amtW = 210;
  const prodW = CW - qtyW - unitW - amtW;
  const qtyX = L + prodW;
  const unitX = qtyX + qtyW;
  font(700, 18);
  x.fillStyle = "#6f5a55";
  tracked(x, "SẢN PHẨM", L, y, 0.8, "left");
  tracked(x, "SỐ LƯỢNG", qtyX + qtyW / 2, y, 0.8, "center");
  tracked(x, "ĐƠN GIÁ", unitX + unitW - 8, y, 0.8, "right");
  tracked(x, "THÀNH TIỀN", R, y, 0.8, "right");
  y += 32;
  x.strokeStyle = "#3d3530";
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(L, y);
  x.lineTo(R, y);
  x.stroke();
  y += 8;

  rows.forEach((it, k) => {
    font(600, 26);
    const nameLines = wrap(x, itemName(it), prodW - 108, 2);
    const rowH = Math.max(104, 28 + nameLines.length * 34);
    const im = thumbs[k];
    const box = 72;
    const by = y + (rowH - box) / 2;
    x.fillStyle = "#fff";
    x.strokeStyle = "#efd9d3";
    x.lineWidth = 2;
    rounded(x, L, by, box, box, 14);
    x.fill();
    x.stroke();
    if (im) {
      x.save();
      rounded(x, L + 4, by + 4, box - 8, box - 8, 10);
      x.clip();
      const sc = Math.min((box - 12) / im.width, (box - 12) / im.height);
      const w = im.width * sc;
      const h = im.height * sc;
      x.drawImage(im, L + box / 2 - w / 2, by + box / 2 - h / 2, w, h);
      x.restore();
    }
    const textH = nameLines.length * 34;
    const textY = y + (rowH - textH) / 2;
    font(600, 26);
    x.fillStyle = "#3d3530";
    nameLines.forEach((line, i) => x.fillText(line, L + box + 16, textY + i * 34));
    font(700, 26);
    x.textAlign = "center";
    x.fillText("× " + it.qty, qtyX + qtyW / 2, y + (rowH - 32) / 2);
    x.textAlign = "right";
    font(500, 24);
    x.fillStyle = "#3d3530";
    x.fillText(it.price ? fmt(it.price) : "Chờ báo giá", unitX + unitW - 8, y + (rowH - 30) / 2);
    font(700, 26);
    x.fillText(it.price ? fmt(it.price * it.qty) : "—", R, y + (rowH - 32) / 2);
    x.textAlign = "left";
    y += rowH;
    x.setLineDash([7, 7]);
    x.strokeStyle = "#efd9d3";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(L, y);
    x.lineTo(R, y);
    x.stroke();
    x.setLineDash([]);
  });

  y += 28;
  const bk = bankOf(shop.bank);
  const bankLine = [bk.bank, bk.acc].filter(Boolean).join(" · ") || "Shop gửi thông tin chuyển khoản qua Zalo";
  const sumW = 400;
  const payW = CW - sumW - 28;
  const qrSize = qr ? 132 : 0;
  const textMax = payW - 44 - (qr ? qrSize + 20 : 0);
  font(700, 26);
  const payTitle = 32;
  font(500, 22);
  const bankLines = wrap(x, bankLine, textMax, 2);
  const nameLines = bk.name ? wrap(x, bk.name, textMax, 1) : [];
  const memoLines = wrap(x, "Nội dung: " + memo, textMax, 2);
  const textH = payTitle + 8 + bankLines.length * 32 + (nameLines.length ? nameLines.length * 30 + 4 : 0) + memoLines.length * 32;
  const payH = Math.max(textH, qrSize) + 40;
  const count = rows.reduce((n, it) => n + it.qty, 0);
  const showShip = !!((o.shippingFee || freeShip(o)) && o.subtotal);
  const sumH = 44 + (showShip ? 40 : 0) + 78;
  const blockH = Math.max(payH, sumH);
  const payY = y + blockH - payH;
  const sumY = y + blockH - sumH;

  x.fillStyle = "#fdf6f3";
  rounded(x, L, payY, payW, payH, 18);
  x.fill();
  let ty = payY + (payH - textH) / 2;
  font(700, 26);
  x.fillStyle = "#3d3530";
  x.fillText("Chuyển khoản", L + 22, ty);
  ty += payTitle + 6;
  font(500, 22);
  x.fillStyle = "#6f5a55";
  bankLines.forEach((line) => {
    x.fillText(line, L + 22, ty);
    ty += 32;
  });
  nameLines.forEach((line) => {
    x.fillText(line, L + 22, ty);
    ty += 30;
  });
  memoLines.forEach((line) => {
    x.fillText(line, L + 22, ty);
    ty += 32;
  });
  if (qr) {
    const qx = L + payW - 20 - qrSize;
    const qy = payY + (payH - qrSize) / 2;
    x.fillStyle = "#fff";
    x.strokeStyle = "#efd9d3";
    x.lineWidth = 2;
    rounded(x, qx, qy, qrSize, qrSize, 14);
    x.fill();
    x.stroke();
    x.drawImage(qr, qx + 10, qy + 10, qrSize - 20, qrSize - 20);
  }

  const sx = L + payW + 28;
  let sy = sumY;
  const rowPair = (label: string, value: string, valueColor = "#3d3530") => {
    font(500, 24);
    x.fillStyle = "#6f5a55";
    x.textAlign = "left";
    x.fillText(label, sx, sy);
    x.fillStyle = valueColor;
    x.textAlign = "right";
    x.fillText(value, R, sy);
    x.textAlign = "left";
    sy += 40;
  };
  rowPair("Tạm tính (" + count + " sản phẩm)", fmt(nf(o.subtotal)));
  if (showShip) rowPair("Phí giao hàng", o.shippingFee ? fmt(o.shippingFee) : "Miễn phí", o.shippingFee ? "#3d3530" : "#2f6b45");
  sy += 8;
  x.strokeStyle = "#3d3530";
  x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(sx, sy);
  x.lineTo(R, sy);
  x.stroke();
  sy += 16;
  font(700, 26);
  x.fillStyle = "#3d3530";
  x.fillText("TỔNG CỘNG", sx, sy + 10);
  font(700, 46, true);
  x.fillStyle = "#a3546a";
  x.textAlign = "right";
  x.fillText(fmt(nf(o.total)), R, sy);
  x.textAlign = "left";

  y += blockH + 32;
  x.setLineDash([7, 7]);
  x.strokeStyle = "#efd9d3";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(L, y);
  x.lineTo(R, y);
  x.stroke();
  x.setLineDash([]);
  y += 22;
  font(500, 22);
  x.fillStyle = "#7d6862";
  const thanks = wrap(x, "Cảm ơn bạn đã tin tưởng " + (shop.store || "shop") + ". Hẹn gặp lại bạn ở đơn sau!", CW - 40, 2);
  thanks.forEach((line) => {
    x.textAlign = "center";
    x.fillText(line, W / 2, y);
    y += 32;
    x.textAlign = "left";
  });

  const pageH = y + PAD + M;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.ceil(pageH);
  const o2 = out.getContext("2d");
  if (!o2) return null;
  const g = o2.createLinearGradient(0, 0, 0, out.height);
  g.addColorStop(0, "#fcf8f0");
  g.addColorStop(1, "#f8efe8");
  o2.fillStyle = g;
  o2.fillRect(0, 0, W, out.height);
  o2.save();
  o2.shadowColor = "rgba(150,90,100,0.16)";
  o2.shadowBlur = 28;
  o2.shadowOffsetY = 10;
  o2.fillStyle = "#ffffff";
  rounded(o2, M, M, W - M * 2, out.height - M * 2, 28);
  o2.fill();
  o2.restore();
  o2.strokeStyle = "#efd9d3";
  o2.lineWidth = 2;
  rounded(o2, M, M, W - M * 2, out.height - M * 2, 28);
  o2.stroke();
  o2.drawImage(layer, 0, 0);
  return new Promise((res) => out.toBlob((b) => res(b), "image/png"));
}
