import { useEffect, useMemo, useRef, useState } from "react";
import { itemName } from "@/services/order-image";
import { useStore } from "@/state/store";
import type { Catalog, Order } from "@/types";
import { fmt, memoOf, nf } from "@/utils/format";
import { copyText, toast } from "@/utils/toast";
import { bankOf, qrDataURL, vietqr } from "@/utils/vietqr";
import { Logo } from "./catalog";

/** Hoa và cánh hoa bung từ giữa rồi rơi như mưa (7 giây), như app gốc. */
function usePetals(on: boolean) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!on || !cv || matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cx = cv.getContext("2d")!,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth,
      H = innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cx.scale(dpr, dpr);
    const cols = ["#c2677f", "#e58fa8", "#f6c6d3", "#ffd9e3", "#a3546a", "#ffe9a8", "#fff"];
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; f: boolean; sw: number };
    const P: P[] = [];
    const add = (x: number, y: number, vx: number, vy: number) =>
      P.push({ x, y, vx, vy, r: 5 + Math.random() * 7, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.25, c: cols[(Math.random() * cols.length) | 0], f: Math.random() < 0.22, sw: Math.random() * 6.28 });
    for (let i = 0; i < 90; i++) {
      const t = Math.random() * Math.PI - Math.PI,
        sp = 6 + Math.random() * 9;
      add(W / 2, H * 0.55, Math.cos(t) * sp, Math.sin(t) * sp - 3);
    }
    let n = 0,
      alive = true,
      raf = 0;
    const rain = setInterval(() => {
      for (let i = 0; i < 6; i++) add(Math.random() * W, -20, (Math.random() - 0.5) * 1.5, 1 + Math.random() * 2);
      if (++n > 40) clearInterval(rain);
    }, 70);
    const t0 = performance.now();
    const step = (t: number) => {
      if (!alive) return;
      cx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += 0.18;
        p.vx *= 0.985;
        p.vy = Math.min(p.vy, 3.2);
        p.sw += 0.06;
        p.x += p.vx + Math.sin(p.sw) * 0.8;
        p.y += p.vy;
        p.a += p.va;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.a);
        if (p.f) {
          cx.font = p.r * 2.6 + "px serif";
          cx.textAlign = "center";
          cx.textBaseline = "middle";
          cx.fillText("🌸", 0, 0);
        } else {
          cx.fillStyle = p.c;
          cx.beginPath();
          cx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.283);
          cx.fill();
          cx.fillStyle = "rgba(255,255,255,.35)";
          cx.beginPath();
          cx.ellipse(-p.r * 0.3, -p.r * 0.15, p.r * 0.35, p.r * 0.18, 0, 0, 6.283);
          cx.fill();
        }
        cx.restore();
      }
      for (let i = P.length - 1; i >= 0; i--) if (P[i].y > H + 40) P.splice(i, 1);
      if (t - t0 < 7000 && (P.length || n <= 40)) raf = requestAnimationFrame(step);
      else cx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      clearInterval(rain);
      cancelAnimationFrame(raf);
    };
  }, [on]);
  return ref;
}

const PayRow = ({ k, v, cp }: { k: string; v: string; cp?: string }) => (
  <div className="pay-r">
    <small>{k}</small>
    <b>{v}</b>
    {cp ? (
      <button onClick={() => copyText(cp, "Đã sao chép")} aria-label={`Sao chép ${k}`}>
        Sao chép
      </button>
    ) : null}
  </div>
);

function Pay({ o, D }: { o: Order; D: Catalog }) {
  const b = bankOf(D.bank),
    qr = D.qr || "";
  const amt = nf(o.total),
    memo = memoOf(o);
  const vq = vietqr(D.bank, amt, memo);
  const src = useMemo(() => qrDataURL(vq) || qr, [vq, qr]);
  if (!b.acc && !qr && !vq)
    return (
      <div className="inv-qr">
        <span>Shop sẽ gửi thông tin thanh toán qua Zalo sau khi xác nhận đơn.</span>
      </div>
    );
  return (
    <div className="pay">
      <h3>Thông tin chuyển khoản</h3>
      <div className="pay-in">
        {src ? <img src={src} alt="Mã QR thanh toán" /> : null}
        <div className="pay-rows">
          {b.bank ? <PayRow k="Ngân hàng" v={b.bank} /> : null}
          {b.acc ? <PayRow k="Số tài khoản" v={b.acc} cp={b.acc} /> : null}
          {b.name ? <PayRow k="Chủ tài khoản" v={b.name} /> : null}
          {amt ? <PayRow k="Số tiền" v={fmt(amt)} cp={String(amt)} /> : null}
          <PayRow k="Nội dung" v={memo} cp={memo} />
        </div>
      </div>
      <p className="pay-n">
        {vq && amt ? "Quét mã QR bằng app ngân hàng, số tiền và nội dung sẽ tự điền. " : qr || vq ? "Quét mã QR hoặc chuyển khoản theo thông tin trên. " : ""}Vui lòng ghi đúng nội dung để shop xác nhận nhanh.
      </p>
    </div>
  );
}

export function Invoice({ o, D }: { o: Order; D: Catalog }) {
  const ds = new Date(o.createdAt || Date.now()).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="inv">
      <div className="inv-logo">
        <Logo src={D.logo} />
      </div>
      <h2 className="inv-t">HÓA ĐƠN</h2>
      <div className="inv-meta">
        <div>
          <small>KHÁCH HÀNG</small>
          <b>{o.phone || ""}</b>
          {o.addr ? <span>{o.addr}</span> : null}
        </div>
        <div className="r">
          <small>NGÀY</small>
          <b>{ds}</b>
          <span>#{o.code}</span>
        </div>
      </div>
      <div className="inv-list">
        {o.items.map((it, k) => (
          <div className="inv-row" key={k}>
            <span className="inv-ph">{it.img ? <img src={it.img} alt="" /> : null}</span>
            <span className="inv-nm">
              <b>{itemName(it)}</b>
              <span>
                <em>× {it.qty}</em>
                {it.price ? fmt(it.price) : "chờ báo giá"}
              </span>
            </span>
            <strong>{it.price ? fmt(it.price * it.qty) : "—"}</strong>
          </div>
        ))}
      </div>
      {o.subtotal && (o.shippingFee || (o.shipBase ?? 0) > 0) ? (
        <div className="inv-tot inv-ship">
          <span>Phí giao hàng</span>
          <b>{o.shippingFee ? fmt(o.shippingFee) : "Miễn phí"}</b>
        </div>
      ) : null}
      <div className="inv-tot">
        <span>Tổng cộng</span>
        <b>{fmt(nf(o.total))}</b>
      </div>
      {o.paid ? <div className="inv-paid">✓ Bạn đã báo chuyển khoản, shop sẽ kiểm tra và xác nhận</div> : <Pay o={o} D={D} />}
      <p className="inv-thx">Cảm ơn bạn đã ủng hộ {D.store} ♡</p>
    </div>
  );
}

function BillView({ o: o0, success }: { o: Order; success?: boolean }) {
  const { D, MY, setOverlay, setOpen, markPaid } = useStore();
  const o = MY.find((x) => x.code === o0.code) ?? o0;
  const canvas = usePetals(!!success);
  const [busy, setBusy] = useState(false);
  if (!D) return null;
  const amt = nf(o.total),
    unpaid = !o.paid && o.status !== "confirmed" && amt > 0;
  const close = (t?: string) => {
    setOverlay(null);
    setOpen(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (t) toast(t);
  };
  return (
    <div className="cel inv-mode" role="dialog" aria-label={"Hóa đơn " + o.code}>
      {success ? <canvas ref={canvas} aria-hidden="true"></canvas> : null}
      <div className="inv-wrap">
        {success ? (
          <div className="ok-hd">
            <div className="cel-ic">🌸</div>
            <h2>{D.store} đã nhận được đơn hàng!</h2>
            <p>
              Cảm ơn bạn đã tin tưởng {D.store} ♡<br />
              Bạn xem lại hóa đơn và quét mã QR bên dưới để thanh toán nhé.
            </p>
          </div>
        ) : null}
        <Invoice o={o} D={D} />
        <div className="inv-acts">
          {unpaid ? (
            <>
              <button
                className="btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  if (await markPaid(o)) close("Cảm ơn bạn! " + D.store + " sẽ kiểm tra và xác nhận đơn ♡");
                  else setBusy(false);
                }}
              >
                {busy ? "Đang ghi nhận…" : "✅ Tôi đã chuyển khoản"}
              </button>
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => close("Bạn có thể thanh toán sau trong mục Đơn của bạn")}>
                Chuyển khoản sau
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => close()}>
              Trở lại trang chính
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Celebrate({ code, ord }: { code: string; ord: Order }) {
  const { D, setOverlay, setOpen } = useStore();
  const canvas = usePetals(true);
  const [out, setOut] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => first.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);
  if (!D) return null;
  const close = (go: boolean) => {
    setOut(true);
    setTimeout(() => {
      setOverlay(null);
      if (go) setOpen("orders");
    }, 250);
  };
  const isInv = ord.items.length > 0;
  return (
    <div
      className={`cel${isInv ? " inv-mode" : ""}${out ? " out" : ""}`}
      role="dialog"
      aria-label="Đặt hàng thành công"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.tagName === "CANVAS" || t.classList.contains("inv-wrap")) close(false);
      }}
    >
      <canvas ref={canvas} aria-hidden="true"></canvas>
      {isInv ? (
        <div className="inv-wrap">
          <div className="ok-hd">
            <div className="cel-ic">🌸</div>
            <h2>{D.store} đã nhận được đơn hàng!</h2>
            <p>
              Cảm ơn bạn đã tin tưởng {D.store} ♡<br />
              Đơn #{code} đã gửi tới shop.
            </p>
          </div>
          <Invoice o={ord} D={D} />
          <div className="inv-acts">
            <button ref={first} className="btn" onClick={() => close(true)}>
              Xem đơn của bạn
            </button>
            <button className="cel-x" onClick={() => close(false)}>
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      ) : (
        <div className="cel-card">
          <div className="cel-ic">🌸</div>
          <h2>{D.store} đã nhận yêu cầu!</h2>
          <div className="cel-code">Đơn #{code}</div>
          <p>
            Cảm ơn bạn đã tin tưởng <b>{D.store}</b> ♡<br />
            Shop đã nhận yêu cầu và sẽ báo giá cho bạn.
          </p>
          <button ref={first} className="btn" onClick={() => close(true)}>
            Xem đơn của bạn
          </button>
          <button className="cel-x" onClick={() => close(false)}>
            Tiếp tục mua sắm
          </button>
        </div>
      )}
    </div>
  );
}

export function Overlays() {
  const { overlay } = useStore();
  if (!overlay) return null;
  return overlay.type === "bill" ? <BillView key={overlay.o.code} o={overlay.o} success={overlay.success} /> : <Celebrate key={overlay.code} code={overlay.code} ord={overlay.ord} />;
}
