import LOGO from "@/static/logo.svg?raw";
import type { SupportDesk, SupportInvoice } from "@/types";
import { fmt, memoOf, nf } from "@/utils/format";
import { bankOf, qrDataURL, vietqr } from "@/utils/vietqr";

const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
const freeShip = (o: { shipBase?: number | null; shippingFee: number }) => !!o.shipBase && o.shipBase > 0 && o.shippingFee === 0;

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

/** Ảnh hoá đơn gọn: logo giữa, món, tổng và ô chuyển khoản. */
export async function invoiceImage(o: SupportInvoice, shop: Pick<SupportDesk, "store" | "logo" | "qr" | "bank">): Promise<Blob | null> {
  const W = 900;
  const P = 56;
  const F = "'Be Vietnam Pro',system-ui,sans-serif";
  const Q = "'Quicksand','Be Vietnam Pro',sans-serif";
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
  let qr: HTMLImageElement | null = null;
  const payload = qrDataURL(vietqr(shop.bank, nf(o.total), memoOf(o)));
  if (payload) qr = await loadImg(payload);
  if (!qr && shop.qr) qr = await loadImg(shop.qr);

  const H = 1100 + rows.length * 150;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#fcf8f0");
  g.addColorStop(0.3, "#fbf5ec");
  g.addColorStop(0.65, "#f8ebe4");
  g.addColorStop(1, "#f2d5d3");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#e2b3bf";
  x.lineWidth = 3;
  x.strokeRect(14, 14, W - 28, H - 28);

  let y = 50;
  if (logo) {
    const lw = 380;
    const lh = lw * (logo.height / logo.width || 0.57);
    x.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + 30;
  } else {
    x.font = `700 70px ${Q}`;
    x.fillStyle = "#a3546a";
    x.textAlign = "center";
    x.fillText(shop.store || "MT store", W / 2, y + 70);
    x.textAlign = "left";
    y += 110;
  }
  x.textAlign = "center";
  x.fillStyle = "#3d3530";
  x.font = `500 34px ${F}`;
  x.fillText("HÓA ĐƠN", W / 2, y + 20);
  x.textAlign = "left";
  y += 70;

  const ds = new Date(o.createdAt || Date.now()).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  x.font = `600 18px ${F}`;
  x.fillStyle = "#9a8580";
  x.fillText("KHÁCH HÀNG", P, y);
  x.textAlign = "right";
  x.fillText("NGÀY", W - P, y);
  x.font = `700 28px ${F}`;
  x.fillStyle = "#3d3530";
  x.fillText(ds, W - P, y + 40);
  x.font = `500 20px ${F}`;
  x.fillStyle = "#7a6a66";
  x.fillText("#" + o.code, W - P, y + 72);
  x.textAlign = "left";
  x.font = `700 28px ${F}`;
  x.fillStyle = "#3d3530";
  x.fillText((o.name || "Khách").slice(0, 28), P, y + 40);
  x.font = `500 20px ${F}`;
  x.fillStyle = "#7a6a66";
  x.fillText([o.phone, o.addr].filter(Boolean).join(" · ").slice(0, 42), P, y + 72);
  y += 110;
  x.strokeStyle = "#d9c6c0";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(P, y);
  x.lineTo(W - P, y);
  x.stroke();
  y += 20;

  const wrap = (t: string, mx: number) => {
    const words = String(t).split(" ");
    let line = "";
    const out: string[] = [];
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (x.measureText(next).width > mx && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  };
  const rr = (X: number, Y: number, w: number, h: number, r: number) => {
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + w, Y, X + w, Y + h, r);
    x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r);
    x.arcTo(X, Y, X + w, Y, r);
    x.closePath();
  };

  for (const it of rows) {
    const im = it.img ? await loadImg(it.img) : null;
    x.save();
    x.shadowColor = "rgba(150,90,100,.18)";
    x.shadowBlur = 14;
    x.shadowOffsetY = 4;
    x.fillStyle = "#fff";
    rr(P, y + 10, 104, 104, 18);
    x.fill();
    x.restore();
    if (im) {
      x.save();
      rr(P, y + 10, 104, 104, 18);
      x.clip();
      const sc = Math.min(96 / im.width, 96 / im.height);
      const w = im.width * sc;
      const h = im.height * sc;
      x.drawImage(im, P + 52 - w / 2, y + 62 - h / 2, w, h);
      x.restore();
    }
    x.font = `700 26px ${F}`;
    x.fillStyle = "#3d3530";
    const lines = wrap(itemName(it), W - P * 2 - 300).slice(0, 2);
    lines.forEach((l, k) => x.fillText(l, P + 130, y + 48 + k * 32));
    const py = y + 48 + lines.length * 32 + 4;
    x.font = `700 20px ${F}`;
    const qty = "× " + it.qty;
    const qw = x.measureText(qty).width + 20;
    x.fillStyle = "#f3dfe0";
    rr(P + 130, py - 22, qw, 32, 9);
    x.fill();
    x.fillStyle = "#7f3d52";
    x.fillText(qty, P + 140, py);
    x.font = `500 20px ${F}`;
    x.fillStyle = "#9a8580";
    x.fillText(it.price ? fmt(it.price) : "chờ báo giá", P + 140 + qw, py);
    x.font = `700 26px ${F}`;
    x.fillStyle = "#3d3530";
    x.textAlign = "right";
    x.fillText(it.price ? fmt(it.price * it.qty) : "—", W - P, y + 70);
    x.textAlign = "left";
    y += 130;
    x.setLineDash([6, 6]);
    x.strokeStyle = "#e2c4c2";
    x.beginPath();
    x.moveTo(P, y);
    x.lineTo(W - P, y);
    x.stroke();
    x.setLineDash([]);
  }

  if ((o.shippingFee || freeShip(o)) && o.subtotal) {
    y += 40;
    x.font = `600 22px ${F}`;
    x.fillStyle = "#7a6a66";
    x.fillText("Phí giao hàng", P, y);
    x.textAlign = "right";
    x.fillText(o.shippingFee ? fmt(o.shippingFee) : "Miễn phí", W - P, y);
    x.textAlign = "left";
  }
  y += 60;
  x.font = `700 28px ${F}`;
  x.fillStyle = "#3d3530";
  x.fillText("Tổng cộng", P, y);
  x.font = `700 54px ${Q}`;
  x.fillStyle = "#c2677f";
  x.textAlign = "right";
  x.fillText(fmt(nf(o.total)), W - P, y + 6);
  x.textAlign = "left";
  y += 50;

  const bk = bankOf(shop.bank);
  const memo = memoOf(o);
  const bl: [string, string][] = [];
  if (bk.bank) bl.push(["Ngân hàng", bk.bank]);
  if (bk.acc) bl.push(["Số tài khoản", bk.acc]);
  if (bk.acc || qr) {
    bl.push(["Số tiền", fmt(nf(o.total))]);
    bl.push(["Nội dung", memo]);
  }
  const bh = bl.length ? Math.max(qr ? 230 : 0, 40 + bl.length * 58) : 100;
  x.fillStyle = "rgba(255,255,255,.72)";
  rr(P, y, W - P * 2, bh, 24);
  x.fill();
  x.strokeStyle = "#e9c9cc";
  x.lineWidth = 2;
  x.stroke();
  if (bl.length) {
    let tx = P + 28;
    if (qr) {
      x.fillStyle = "#fff";
      rr(P + 24, y + 20, 190, 190, 16);
      x.fill();
      x.drawImage(qr, P + 34, y + 30, 170, 170);
      tx = P + 240;
    }
    bl.forEach((row, k) => {
      x.font = `600 18px ${F}`;
      x.fillStyle = "#9a8580";
      x.fillText(row[0], tx, y + 40 + k * 58);
      x.font = `700 25px ${F}`;
      x.fillStyle = "#3d3530";
      x.fillText(row[1], tx, y + 68 + k * 58);
    });
  }
  y += bh + 60;
  x.textAlign = "center";
  x.font = `700 26px ${F}`;
  x.fillStyle = "#c2677f";
  x.fillText("Cảm ơn bạn đã ủng hộ " + (shop.store || "shop") + " ♡", W / 2, y);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.min(H, y + 50);
  const o2 = out.getContext("2d");
  if (!o2) return null;
  o2.drawImage(c, 0, 0);
  o2.strokeStyle = "#e2b3bf";
  o2.lineWidth = 3;
  o2.strokeRect(14, 14, W - 28, out.height - 28);
  return new Promise((r) => out.toBlob((b) => r(b), "image/png"));
}
