import LOGO from "@/logo.svg?raw";
import type { Order, Settings } from "./types";
type Catalog = Pick<Settings, "store" | "bank" | "qr">;
import { fmt } from "./format";
const nf = (n: unknown) => Number(n) || 0;
export const memoOf = (o: { code: string; phone?: string }) => o.code + " " + String(o.phone || "").replace(/\D/g, "");
import { loadImg } from "./load-img";
import { bankOf, qrDataURL, vietqr } from "./vietqr";

/** Nội dung tin nhắn gửi shop. */
export function zText(o: Order, store: string) {
  const L = [`ĐƠN #${o.code} – ${store}`];
  if (o.product) L.push("Nhu cầu: " + o.product);
  o.items.forEach((i) => L.push(`• [${i.country}] ${itemName(i)} × ${i.qty} = ${i.price ? fmt(i.price * i.qty) : "chờ báo giá"}`));
  if (o.items.length) L.push("Tạm tính: " + fmt(nf(o.total)));
  if (o.phone) L.push("SĐT: " + o.phone);
  if (o.addr) L.push("Địa chỉ: " + o.addr);
  return L.join("\n");
}

export const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);

/** Ảnh hoá đơn / yêu cầu tìm hàng (PNG 900px), vẽ bằng canvas như app gốc. */
export async function orderImage(o: Order, D: Catalog): Promise<Blob | null> {
  const W = 900,
    P = 56,
    F = "'Be Vietnam Pro',system-ui,sans-serif",
    Q = "'Quicksand','Be Vietnam Pro',sans-serif";
  const rows = o.items;
  const shots: HTMLImageElement[] = [];
  for (const f of (o.shots || []).slice(0, 6)) {
    const u = URL.createObjectURL(f);
    const im = await loadImg(u);
    URL.revokeObjectURL(u);
    if (im) shots.push(im);
  }
  if (!shots.length && !rows.length) for (const u of o.photos.slice(0, 6)) {
    const im = await loadImg(u);
    if (im) shots.push(im);
  }
  let logo: HTMLImageElement | null = null;
  try {
    let t = LOGO.replace(/currentColor/g, "#a3546a").match(/<svg[\s\S]*<\/svg>/)?.[0];
    if (t) {
      if (!/xmlns=/.test(t)) t = t.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      logo = await loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(t));
    }
  } catch {}
  let qr: HTMLImageElement | null = null;
  if (rows.length) {
    const u = qrDataURL(vietqr(D.bank, nf(o.total), memoOf(o)));
    if (u) qr = await loadImg(u);
  }
  if (!qr && D.qr) qr = await loadImg(D.qr);
  const sz = (W - P * 2 - 40) / 3,
    isInv = rows.length > 0;
  const H =
    400 + 120 + (o.product ? 80 : 0) + rows.length * 130 + (shots.length ? Math.ceil(shots.length / 3) * (sz + 20) + 10 : 0) +
    (isInv ? 120 + (o.shippingFee ? 50 : 0) : 0) + (isInv ? (qr ? 260 : 130) : 0) + 120;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing: string };
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
    const lw = 380,
      lh = lw * (logo.height / logo.width || 0.57);
    x.drawImage(logo, (W - lw) / 2, y, lw, lh);
    y += lh + 30;
  } else {
    x.font = `700 70px ${Q}`;
    x.fillStyle = "#a3546a";
    x.textAlign = "center";
    x.fillText(D.store, W / 2, y + 70);
    x.textAlign = "left";
    y += 110;
  }
  x.textAlign = "center";
  x.fillStyle = "#3d3530";
  x.font = `500 34px ${F}`;
  x.letterSpacing = "10px";
  x.fillText(isInv ? "HÓA ĐƠN" : "YÊU CẦU TÌM HÀNG", W / 2, y + 20);
  x.letterSpacing = "0px";
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
  x.fillText(o.phone || "", P, y + 40);
  x.font = `500 20px ${F}`;
  x.fillStyle = "#7a6a66";
  x.fillText(String(o.addr || "").slice(0, 46), P, y + 72);
  y += 100;
  x.strokeStyle = "#d9c6c0";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(P, y);
  x.lineTo(W - P, y);
  x.stroke();
  y += 20;
  const wrap = (t: string, mx: number) => {
    const w = String(t).split(" ");
    let l = "";
    const out: string[] = [];
    for (const k of w) {
      const tt = l ? l + " " + k : k;
      if (x.measureText(tt).width > mx && l) {
        out.push(l);
        l = k;
      } else l = tt;
    }
    if (l) out.push(l);
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
  if (o.product) {
    x.font = `700 30px ${F}`;
    x.fillStyle = "#a3546a";
    wrap("Nhu cầu: " + o.product, W - P * 2)
      .slice(0, 2)
      .forEach((l) => {
        x.fillText(l, P, y + 30);
        y += 40;
      });
    y += 20;
  }
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
      const sc = Math.min(96 / im.width, 96 / im.height),
        w = im.width * sc,
        h = im.height * sc;
      x.drawImage(im, P + 52 - w / 2, y + 62 - h / 2, w, h);
      x.restore();
    }
    x.font = `700 26px ${F}`;
    x.fillStyle = "#3d3530";
    const ls = wrap(itemName(it), W - P * 2 - 130 - 170).slice(0, 2);
    ls.forEach((l, k) => x.fillText(l, P + 130, y + 48 + k * 32));
    const py = y + 48 + ls.length * 32 + 4;
    x.font = `700 20px ${F}`;
    const pt = "× " + it.qty,
      pw = x.measureText(pt).width + 20;
    x.fillStyle = "#f3dfe0";
    rr(P + 130, py - 22, pw, 32, 9);
    x.fill();
    x.fillStyle = "#7f3d52";
    x.fillText(pt, P + 140, py);
    x.font = `500 20px ${F}`;
    x.fillStyle = "#9a8580";
    x.fillText(it.price ? fmt(it.price) : "chờ báo giá", P + 140 + pw, py);
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
  if (shots.length) {
    y += 10;
    shots.forEach((im, k) => {
      const cx = P + (k % 3) * (sz + 20),
        cy = y + Math.floor(k / 3) * (sz + 20);
      const sc = Math.max(sz / im.width, sz / im.height),
        w = im.width * sc,
        h = im.height * sc;
      x.save();
      rr(cx, cy, sz, sz, 18);
      x.clip();
      x.drawImage(im, cx + (sz - w) / 2, cy + (sz - h) / 2, w, h);
      x.restore();
    });
    y += Math.ceil(shots.length / 3) * (sz + 20);
  }
  if (isInv) {
    if (o.shippingFee && o.subtotal) {
      y += 40;
      x.font = `600 22px ${F}`;
      x.fillStyle = "#7a6a66";
      x.fillText("Phí giao hàng", P, y);
      x.textAlign = "right";
      x.fillText(fmt(o.shippingFee), W - P, y);
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
    const bk = bankOf(D.bank),
      memo = memoOf(o),
      bl: [string, string][] = [];
    if (bk.bank) bl.push(["Ngân hàng", bk.bank]);
    if (bk.acc) bl.push(["Số tài khoản", bk.acc]);
    if (bk.name) bl.push(["Chủ tài khoản", bk.name]);
    if (bk.acc || qr) {
      bl.push(["Số tiền", fmt(nf(o.total))]);
      bl.push(["Nội dung", memo]);
    }
    const bh = bl.length ? Math.max(qr ? 230 : 0, 40 + bl.length * 58) : 100;
    x.fillStyle = "rgba(255,255,255,.4)";
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
      bl.forEach((r, k) => {
        x.font = `600 18px ${F}`;
        x.fillStyle = "#9a8580";
        x.fillText(r[0], tx, y + 40 + k * 58);
        x.font = `700 25px ${F}`;
        x.fillStyle = "#3d3530";
        x.fillText(r[1], tx, y + 68 + k * 58);
      });
    } else {
      x.font = `600 24px ${F}`;
      x.fillStyle = "#7f3d52";
      x.textAlign = "center";
      wrap("Shop sẽ gửi thông tin thanh toán qua Zalo sau khi xác nhận đơn.", W - P * 2 - 60).forEach((l, k) => x.fillText(l, W / 2, y + 45 + k * 32));
      x.textAlign = "left";
    }
    y += bh;
  }
  y += 60;
  x.textAlign = "center";
  x.font = `700 26px ${F}`;
  x.fillStyle = "#c2677f";
  x.fillText("Cảm ơn bạn đã ủng hộ " + D.store + " ♡", W / 2, y);
  x.textAlign = "left";
  const out = document.createElement("canvas");
  out.width = W;
  out.height = Math.min(H, y + 50);
  out.getContext("2d")!.drawImage(c, 0, 0);
  const o2 = out.getContext("2d")!;
  o2.strokeStyle = "#e2b3bf";
  o2.lineWidth = 3;
  o2.strokeRect(14, 14, W - 28, out.height - 28);
  return new Promise((r) => out.toBlob((b) => r(b), "image/png"));
}
