import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/api";
import { toast, useApp } from "@/app-state";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { CN, dots, dotsInput, initialOf, parseMoney } from "@/format";
import LOGO from "@/logo.svg";
import { sx } from "@/sx";
import type { Market, Prefs, Settings as S } from "@/types";
import { binOf } from "@/vietqr";

/* Cài đặt cửa hàng — theo artboard "Cài đặt cửa hàng" (CaiDat.dc.html). */

const CARD = "break-inside: avoid; margin-bottom: 18px; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; padding: 20px 22px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; gap: 16px";
const H2 = "margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #3d3530";
const LBL = "font-size: 13px; font-weight: 600; color: #6f5a55";
const INPUT = "box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 11px 12px; font: inherit";
const SMALL = "box-sizing: border-box; width: 100%; border: 1px solid #efd9d3; background: #ffffff; border-radius: 10px; padding: 9px 10px; font: inherit; font-size: 14px";
const HINT = "font-size: 12.5px; color: #7d6862";
const SUFFIX = "position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 13px";

/** Bản nháp: số tiền giữ dạng chuỗi có dấu chấm như ô nhập của thiết kế. */
interface Draft {
  store: string;
  subtitle: string;
  logo: string;
  tagline: string;
  zalo: string;
  messenger: string;
  storefrontUrl: string;
  markets: Market[];
  cats: string[];
  bank: string;
  acc: string;
  holder: string;
  qr: string;
  ship: string;
  free: string;
  orderNote: string;
  prefs: Prefs;
}

const toDraft = (s: S): Draft => ({
  store: s.store,
  subtitle: s.subtitle,
  logo: s.logo || "",
  tagline: s.tagline,
  zalo: s.zalo,
  messenger: s.messenger,
  storefrontUrl: s.storefrontUrl,
  markets: s.markets.map((m) => ({ ...m })),
  cats: [...s.cats],
  bank: s.bank.bank,
  acc: s.bank.acc,
  holder: s.bank.name,
  qr: s.qr,
  ship: s.shippingFee ? dots(s.shippingFee) : "",
  free: s.freeShipFrom ? dots(s.freeShipFrom) : "",
  orderNote: s.orderNote || "",
  prefs: { ...s.prefs },
});

/** Ảnh logo / QR: vẽ lại thành PNG (giữ nền trong suốt; SVG cũng thành PNG vì server chỉ nhận ảnh raster). */
function toPng(file: Blob, max: number): Promise<Blob> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w0 = img.naturalWidth || max,
        h0 = img.naturalHeight || max;
      const k = Math.min(1, max / Math.max(w0, h0)) || 1;
      const c = document.createElement("canvas");
      c.width = Math.round(w0 * k) || max;
      c.height = Math.round(h0 * k) || max;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res(b) : rej(new Error("Không đọc được ảnh"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Không đọc được ảnh này"));
    };
    img.src = url;
  });
}

function Switch({ on }: { on: boolean }) {
  return (
    <span style={sx("box-sizing: border-box; flex: 0 0 44px; width: 44px; height: 26px; border-radius: 999px; padding: 3px; display: flex; " + (on ? "background: #b3566f; justify-content: flex-end" : "background: #e2d3cf; justify-content: flex-start"))}>
      <span style={sx("box-sizing: border-box; width: 20px; height: 20px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2)")}></span>
    </span>
  );
}

const Field = ({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) => (
  <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
    <span style={sx(LBL)}>{label}</span>
    {children}
    {hint ? <span style={sx(HINT)}>{hint}</span> : null}
  </label>
);

const LockIcon = ({ open }: { open: boolean }) => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2"></rect>
    <path d={open ? "M8 11V8a4 4 0 0 1 7.5-2" : "M8 11V8a4 4 0 0 1 8 0v3"}></path>
  </svg>
);

const PREFS: [keyof Prefs, string, string][] = [
  ["notiOrder", "Báo khi có đơn mới", "Hiện chấm đỏ và phát tiếng trên trang quản lý"],
  ["notiFind", "Báo khi có yêu cầu tìm hộ", "Khách gửi ảnh nhờ tìm sản phẩm"],
  ["hideRev", "Ẩn doanh thu khi mở trang", "Số doanh thu hiện dạng ••••• cho tới khi bấm con mắt"],
];

/** "5/11" → "05/11" khi rời ô; để trống nếu không hợp lệ. */
const ddmm = (v: string) => {
  const m = v.trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/);
  if (!m) return v.trim() ? v.trim() : "";
  const d = +m[1],
    mo = +m[2];
  return d >= 1 && d <= 31 && mo >= 1 && mo <= 12 ? String(d).padStart(2, "0") + "/" + String(mo).padStart(2, "0") : v.trim();
};
const ddmmOk = (v: string) => !v || /^\d{2}\/\d{2}$/.test(v);

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    if (next.length < 6) return setErr("Mật khẩu mới cần ít nhất 6 ký tự");
    if (next !== again) return setErr("Hai lần nhập mật khẩu mới chưa khớp");
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      toast("Đã đổi mật khẩu");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={sx("display: flex; flex-direction: column; gap: 10px; padding-top: 12px; border-top: 1px dashed #efd9d3")}>
      <Field label="Mật khẩu hiện tại">
        <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} style={sx(INPUT)} />
      </Field>
      <div className="stack-2" style={sx("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px")}>
        <Field label="Mật khẩu mới">
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} style={sx(INPUT)} />
        </Field>
        <Field label="Nhập lại">
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} style={sx(INPUT)} />
        </Field>
      </div>
      {err ? <p role="alert" style={sx("margin: 0; font-size: 14px; background: #fbe7ec; color: #8f4459; border-radius: 12px; padding: 10px 12px")}>{err}</p> : null}
      <div style={sx("display: flex; gap: 8px; justify-content: flex-end")}>
        <button type="button" onClick={onDone} style={sx("border: 1px solid #efd9d3; background: #ffffff; color: #6f5a55; border-radius: 12px; padding: 10px 16px; font-weight: 600; font-size: 14px")}>
          Huỷ
        </button>
        <button type="button" onClick={submit} disabled={busy} style={sx("border: 0; background: #b3566f; color: #ffffff; border-radius: 12px; padding: 10px 16px; font-weight: 700; font-size: 14px" + (busy ? "; opacity: 0.7" : ""))}>
          {busy ? "Đang lưu…" : "Đổi mật khẩu"}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { settings, setSettings, me, logout } = useApp();
  const [base, setBase] = useState<Draft | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState(false);
  const [upl, setUpl] = useState<"" | "logo" | "qr">("");
  const logoIn = useRef<HTMLInputElement>(null);
  const qrIn = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings && !d) {
      const x = toDraft(settings);
      setBase(x);
      setD(x);
    }
  }, [settings]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  const dirty = !!d && !!base && JSON.stringify(d) !== JSON.stringify(base);

  // Rời trang khi còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (!d)
    return (
      <Shell>
        <main className="main-pad" style={sx(MAIN.scroll)}>
          <p style={sx("margin: 0; color: #7d6862")}>Đang tải…</p>
        </main>
      </Shell>
    );

  const set = (p: Partial<Draft>) => {
    setSaved(false);
    setD({ ...d, ...p });
  };
  const setMarket = (k: string, p: Partial<Market>) => set({ markets: d.markets.map((m) => (m.key === k ? { ...m, ...p } : m)) });
  const addCat = () => {
    const v = newCat.trim();
    if (v && !d.cats.includes(v)) set({ cats: [...d.cats, v] });
    setNewCat("");
  };
  const bin = binOf(d.bank);

  const pick = async (kind: "logo" | "qr", f?: File | null) => {
    if (!f) return;
    setUpl(kind);
    try {
      const { url } = await api.upload(await toPng(f, kind === "logo" ? 600 : 800));
      set(kind === "logo" ? { logo: url } : { qr: url });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUpl("");
    }
  };

  const save = async () => {
    const bad = d.markets.find((m) => m.open && (!ddmmOk(m.fly) || !ddmmOk(m.until)));
    if (bad) return toast(`Ngày của ${CN[bad.key] || bad.key} cần dạng dd/mm`);
    setSaving(true);
    try {
      const u = await api.saveSettings({
        store: d.store.trim() || "MT store",
        subtitle: d.subtitle.trim().toUpperCase(),
        logo: d.logo,
        tagline: d.tagline.trim(),
        zalo: d.zalo.replace(/[^\d+]/g, ""),
        messenger: d.messenger.trim(),
        storefrontUrl: d.storefrontUrl.trim(),
        markets: d.markets.map((m) => ({ key: m.key, open: m.open, fly: m.fly, until: m.until })),
        cats: d.cats,
        bank: { bank: d.bank.trim(), bin, acc: d.acc.replace(/\s/g, ""), name: d.holder.trim().toUpperCase() },
        qr: d.qr,
        shippingFee: parseMoney(d.ship),
        freeShipFrom: parseMoney(d.free),
        orderNote: d.orderNote.trim(),
        prefs: d.prefs,
      });
      setSettings(u);
      const x = toDraft(u);
      setBase(x);
      setD(x);
      setSaved(true);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const ship = parseMoney(d.ship),
    free = parseMoney(d.free);

  return (
    <Shell>
      <main className="main-pad" style={sx(MAIN.scroll + "; padding: 28px 32px 120px")}>
        <MobileHead title="Cài đặt cửa hàng" sub="Hiện trên trang bán hàng của khách" />
        <div className="only-desktop" style={sx("display: flex; flex-direction: column; gap: 2px")}>
          <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>Cài đặt cửa hàng</h1>
          <span style={sx("color: #7d6862; font-size: 14px")}>Thông tin ở đây hiện trên trang bán hàng của khách</span>
        </div>

        {/* Thiết kế dùng `columns: 2 400px`; chia sẵn 2 cột để thứ tự thẻ giữ đúng như thiết kế. */}
        <div style={sx("display: flex; flex-wrap: wrap; column-gap: 18px; align-items: flex-start")}>
          <div style={sx("flex: 1 1 400px; min-width: 0; display: flex; flex-direction: column")}>
          {/* Thông tin cửa hàng */}
          <section aria-labelledby="s-info" style={sx(CARD)}>
            <h2 id="s-info" style={sx(H2)}>
              Thông tin cửa hàng
            </h2>
            <div style={sx("display: flex; align-items: center; gap: 16px")}>
              <div style={sx("width: 120px; height: 88px; flex: 0 0 120px; border-radius: 16px; background: #ffffff; border: 1px solid #efd9d3; display: flex; align-items: center; justify-content: center; overflow: hidden")}>
                <img src={d.logo || LOGO} alt={"Logo " + (d.store || "MT store")} style={sx("width: 96px; height: auto; max-height: 76px; object-fit: contain")} />
              </div>
              <div style={sx("display: flex; flex-direction: column; gap: 6px")}>
                <div style={sx("display: flex; gap: 8px; align-items: center")}>
                  <button type="button" onClick={() => logoIn.current?.click()} disabled={upl === "logo"} style={sx("border: 1.5px solid #b3566f; background: #ffffff; color: #a3546a; border-radius: 12px; padding: 9px 14px; font-weight: 700; font-size: 14px")}>
                    {upl === "logo" ? "Đang tải ảnh…" : "Đổi logo"}
                  </button>
                  {d.logo ? (
                    <button type="button" onClick={() => set({ logo: "" })} style={sx("border: 0; background: transparent; color: #8f4459; font-weight: 600; font-size: 13px; padding: 6px 2px; text-decoration: underline")}>
                      Dùng logo gốc
                    </button>
                  ) : null}
                </div>
                <span style={sx(HINT)}>Ảnh PNG hoặc SVG nền trong suốt</span>
                <input ref={logoIn} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden onChange={(e) => (pick("logo", e.target.files?.[0]), (e.target.value = ""))} />
              </div>
            </div>
            <Field label="Tên cửa hàng">
              <input value={d.store} onChange={(e) => set({ store: e.target.value })} style={sx(INPUT)} />
            </Field>
            <Field label="Dòng mô tả dưới logo">
              <input value={d.subtitle} onChange={(e) => set({ subtitle: e.target.value.toUpperCase() })} style={sx(INPUT + "; letter-spacing: 2px")} />
            </Field>
            <Field label="Số Zalo nhận đơn">
              <input inputMode="tel" placeholder="09xx xxx xxx" value={d.zalo} onChange={(e) => set({ zalo: e.target.value })} style={sx(INPUT)} />
            </Field>
          </section>

          {/* Nước & nhóm hàng */}
          <section aria-labelledby="s-cat" style={sx(CARD)}>
            <h2 id="s-cat" style={sx(H2)}>
              Nước &amp; nhóm hàng
            </h2>
            <div style={sx("display: flex; flex-direction: column; gap: 8px")}>
              <span style={sx(LBL)}>
                Nước mở đặt hàng <span style={sx("font-weight: 400; color: #7d6862")}>— chỉ mở nước bạn sắp đi, khoá các nước còn lại</span>
              </span>
              <div style={sx("display: flex; flex-direction: column; gap: 8px")}>
                {d.markets.map((m) => {
                  const on = m.open,
                    name = CN[m.key] || m.key;
                  return (
                    <div key={m.key} style={sx("box-sizing: border-box; border-radius: 14px; padding: 12px 14px; " + (on ? "background: #ffffff; border: 1.5px solid #b3566f" : "background: #f7efec; border: 1.5px solid #efd9d3"))}>
                      <div style={sx("display: flex; align-items: center; gap: 10px")}>
                        <span style={sx("flex: 1; display: flex; flex-direction: column")}>
                          <b style={sx("font-size: 15px")}>{name}</b>
                          <span style={sx("box-sizing: border-box; font-size: 12.5px; " + (on ? "color: #2f6b45; font-weight: 600" : "color: #7d6862"))}>{on ? "Đang mở · khách xem và đặt được" : "Đã khoá · khách không thấy"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setMarket(m.key, { open: !on })}
                          aria-pressed={on}
                          aria-label={on ? "Khoá " + name : "Mở " + name}
                          style={sx(
                            "box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 14px; font-weight: 700; font-size: 13px; min-height: 40px; " +
                              (on ? "border: 0; background: #b3566f; color: #ffffff" : "border: 1px solid #d9c6c1; background: #ffffff; color: #6f5a55"),
                          )}
                        >
                          <LockIcon open={on} />
                          {on ? "Đang mở" : "Đã khoá"}
                        </button>
                      </div>
                      {on ? (
                        <div className="stack-2" style={sx("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding-top: 10px; margin-top: 10px; border-top: 1px dashed #efd9d3")}>
                          <label style={sx("display: flex; flex-direction: column; gap: 4px")}>
                            <span style={sx("font-size: 12px; font-weight: 600; color: #6f5a55")}>Ngày bay</span>
                            <input placeholder="dd/mm" inputMode="numeric" value={m.fly} onChange={(e) => setMarket(m.key, { fly: e.target.value })} onBlur={(e) => setMarket(m.key, { fly: ddmm(e.target.value) })} style={sx(SMALL)} />
                          </label>
                          <label style={sx("display: flex; flex-direction: column; gap: 4px")}>
                            <span style={sx("font-size: 12px; font-weight: 600; color: #6f5a55")}>Nhận đơn đến hết ngày</span>
                            <input placeholder="dd/mm" inputMode="numeric" value={m.until} onChange={(e) => setMarket(m.key, { until: e.target.value })} onBlur={(e) => setMarket(m.key, { until: ddmm(e.target.value) })} style={sx(SMALL)} />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <span style={sx(HINT)}>Nước bị khoá sẽ ẩn khỏi trang bán. Khách chỉ xem và đặt được hàng của nước đang mở.</span>
            </div>
            <div style={sx("display: flex; flex-direction: column; gap: 8px")}>
              <span style={sx(LBL)}>Nhóm hàng</span>
              <div style={sx("display: flex; flex-wrap: wrap; gap: 8px")}>
                {d.cats.map((c, i) => (
                  <span key={c} style={sx("display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #efd9d3; border-radius: 999px; padding: 4px 4px 4px 12px; font-size: 14px; font-weight: 600")}>
                    {c}
                    <button type="button" onClick={() => set({ cats: d.cats.filter((_, j) => j !== i) })} aria-label={"Xoá nhóm " + c} style={sx("width: 28px; height: 28px; border: 0; border-radius: 50%; background: transparent; color: #8f4459; display: flex; align-items: center; justify-content: center; padding: 0")}>
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18"></path>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCat();
                }}
                style={sx("display: flex; gap: 8px")}
              >
                <input aria-label="Tên nhóm hàng mới" placeholder="Thêm nhóm hàng, vd: Đồ chơi" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={sx("box-sizing: border-box; flex: 1; min-width: 0; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 14px")} />
                <button type="submit" style={sx("border: 0; background: #b3566f; color: #ffffff; border-radius: 12px; padding: 10px 16px; font-weight: 700; font-size: 14px")}>
                  Thêm
                </button>
              </form>
            </div>
          </section>

          </div>
          <div style={sx("flex: 1 1 400px; min-width: 0; display: flex; flex-direction: column")}>
          {/* Thanh toán */}
          <section aria-labelledby="s-pay" style={sx(CARD)}>
            <h2 id="s-pay" style={sx(H2)}>
              Thanh toán
            </h2>
            <div className="pay-row" style={sx("display: flex; gap: 16px")}>
              <div style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px")}>
                <Field label="Ngân hàng" hint={d.bank.trim() ? (bin ? "Mã QR trên hoá đơn tự điền sẵn số tiền" : "Chưa nhận ra ngân hàng này · hoá đơn sẽ dùng ảnh QR bạn tải lên") : undefined}>
                  <input placeholder="vd: Vietcombank" value={d.bank} onChange={(e) => set({ bank: e.target.value })} style={sx(INPUT)} />
                </Field>
                <Field label="Số tài khoản">
                  <input inputMode="numeric" placeholder="Nhập số tài khoản" value={d.acc} onChange={(e) => set({ acc: e.target.value })} style={sx(INPUT)} />
                </Field>
                <Field label="Chủ tài khoản">
                  <input placeholder="Viết hoa không dấu" value={d.holder} onChange={(e) => set({ holder: e.target.value })} style={sx(INPUT + "; text-transform: uppercase")} />
                </Field>
              </div>
              <div className="pay-qr" style={sx("flex: 0 0 136px; display: flex; flex-direction: column; gap: 6px; align-items: center")}>
                <span style={sx(LBL + "; align-self: flex-start")}>Mã QR</span>
                {d.qr ? (
                  <button type="button" onClick={() => qrIn.current?.click()} aria-label="Đổi ảnh QR" style={sx("width: 136px; height: 136px; border-radius: 16px; border: 1px solid #efd9d3; background: #ffffff; padding: 6px; box-sizing: border-box")}>
                    <img src={d.qr} alt="Ảnh QR chuyển khoản" style={sx("width: 100%; height: 100%; object-fit: contain; display: block")} />
                  </button>
                ) : (
                  <button type="button" onClick={() => qrIn.current?.click()} disabled={upl === "qr"} style={sx("width: 136px; height: 136px; border-radius: 16px; border: 1.5px dashed #b3566f; background: #fdf3f5; color: #a3546a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font-size: 13px; font-weight: 700")}>
                    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="6" height="6" rx="1"></rect>
                      <rect x="14" y="4" width="6" height="6" rx="1"></rect>
                      <rect x="4" y="14" width="6" height="6" rx="1"></rect>
                      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"></path>
                    </svg>
                    {upl === "qr" ? "Đang tải…" : "Tải ảnh QR"}
                  </button>
                )}
                {d.qr ? (
                  <button type="button" onClick={() => set({ qr: "" })} style={sx("border: 0; background: transparent; color: #8f4459; font-weight: 600; font-size: 12.5px; padding: 2px; text-decoration: underline")}>
                    Bỏ ảnh QR
                  </button>
                ) : null}
                <input ref={qrIn} type="file" accept="image/*" hidden onChange={(e) => (pick("qr", e.target.files?.[0]), (e.target.value = ""))} />
              </div>
            </div>
          </section>

          {/* Giao hàng */}
          <section aria-labelledby="s-ship" style={sx(CARD)}>
            <h2 id="s-ship" style={sx(H2)}>
              Giao hàng
            </h2>
            <div className="stack-2" style={sx("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px")}>
              <Field label="Phí giao hàng" hint={ship ? undefined : "Để trống: không thu phí giao"}>
                <span style={sx("position: relative; display: block")}>
                  <input inputMode="numeric" placeholder="vd 30.000" value={d.ship} onChange={(e) => set({ ship: dotsInput(e.target.value) })} style={sx(INPUT + "; padding: 11px 28px 11px 12px; font-weight: 600")} />
                  <span style={sx(SUFFIX)}>đ</span>
                </span>
              </Field>
              <Field label="Miễn phí giao từ" hint={free && ship ? "Đơn từ " + dots(free) + "đ không tính phí giao" : undefined}>
                <span style={sx("position: relative; display: block")}>
                  <input inputMode="numeric" placeholder="vd 500.000" value={d.free} onChange={(e) => set({ free: dotsInput(e.target.value) })} style={sx(INPUT + "; padding: 11px 28px 11px 12px; font-weight: 600")} />
                  <span style={sx(SUFFIX)}>đ</span>
                </span>
              </Field>
            </div>
            <Field label="Ghi chú cho khách khi đặt hàng">
              <textarea
                rows={3}
                placeholder="vd: Hàng về sau 10–14 ngày. Shop sẽ nhắn Zalo xác nhận trước khi đặt."
                value={d.orderNote}
                onChange={(e) => set({ orderNote: e.target.value })}
                style={sx(INPUT + "; font-size: 14px; resize: vertical")}
              ></textarea>
            </Field>
          </section>

          {/* Thông báo & hiển thị */}
          <section aria-labelledby="s-noti" style={sx(CARD + "; gap: 6px")}>
            <h2 id="s-noti" style={sx(H2 + "; margin: 0 0 6px")}>
              Thông báo &amp; hiển thị
            </h2>
            {PREFS.map(([k, label, hint]) => (
              <button
                key={k}
                type="button"
                onClick={() => set({ prefs: { ...d.prefs, [k]: !d.prefs[k] } })}
                aria-pressed={d.prefs[k]}
                style={sx("display: flex; align-items: center; gap: 12px; width: 100%; border: 0; border-bottom: 1px dashed #efd9d3; background: transparent; padding: 12px 0; text-align: left; font: inherit; color: inherit")}
              >
                <span style={sx("flex: 1; display: flex; flex-direction: column")}>
                  <span style={sx("font-size: 14.5px; font-weight: 600")}>{label}</span>
                  <span style={sx(HINT)}>{hint}</span>
                </span>
                <Switch on={d.prefs[k]} />
              </button>
            ))}
          </section>

          {/* Tài khoản */}
          <section aria-labelledby="s-acc" style={sx(CARD + "; gap: 14px")}>
            <h2 id="s-acc" style={sx(H2)}>
              Tài khoản
            </h2>
            <div style={sx("display: flex; align-items: center; gap: 12px")}>
              <span style={sx("width: 48px; height: 48px; flex: 0 0 48px; border-radius: 50%; background: #f6e1dc; color: #8f4459; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px")}>
                {(settings?.store || "M").trim().charAt(0).toUpperCase() || initialOf(me?.name || "")}
              </span>
              <div style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column")}>
                <b style={sx("font-size: 15px")}>{me?.name || "Chủ shop"}</b>
                <span style={sx("font-size: 13.5px; color: #7d6862; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{me?.email}</span>
              </div>
            </div>
            <div style={sx("display: flex; flex-wrap: wrap; gap: 8px")}>
              <button type="button" onClick={() => setPw(!pw)} aria-expanded={pw} style={sx("border: 1px solid #efd9d3; background: #ffffff; color: #a3546a; border-radius: 12px; padding: 10px 16px; font-weight: 600; font-size: 14px")}>
                Đổi mật khẩu
              </button>
              <button type="button" onClick={logout} style={sx("display: inline-flex; align-items: center; gap: 6px; border: 1px solid #efd9d3; background: #ffffff; color: #8f4459; border-radius: 12px; padding: 10px 16px; font-weight: 600; font-size: 14px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 4h4v16h-4"></path>
                  <path d="M10 8l-4 4 4 4"></path>
                  <path d="M6 12h10"></path>
                </svg>
                Đăng xuất
              </button>
            </div>
            {pw ? <PasswordForm onDone={() => setPw(false)} /> : null}
          </section>

          {/* Thêm ngoài thiết kế: các thông tin trước đây đã có, vẫn cần cho hoá đơn và nút "Xem trang bán hàng". */}
          <section aria-labelledby="s-more" style={sx(CARD)}>
            <h2 id="s-more" style={sx(H2)}>
              Hoá đơn &amp; liên kết
            </h2>
            <Field label="Dòng giới thiệu trên hoá đơn">
              <input placeholder="vd: Hàng xách tay Nhật · Hàn · Úc" value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} style={sx(INPUT)} />
            </Field>
            <Field label="Link trang bán hàng" hint="Nút “Xem trang bán hàng” ở thanh bên">
              <input inputMode="url" placeholder="https://zalo.me/s/…" value={d.storefrontUrl} onChange={(e) => set({ storefrontUrl: e.target.value })} style={sx(INPUT)} />
            </Field>
            <Field label="Link Messenger (không bắt buộc)">
              <input inputMode="url" placeholder="https://m.me/…" value={d.messenger} onChange={(e) => set({ messenger: e.target.value })} style={sx(INPUT)} />
            </Field>
          </section>
          </div>
        </div>
      </main>

      {/* Thanh lưu nổi */}
      {dirty ? (
        <div className="save-bar" style={sx("position: fixed; left: 0; right: 0; bottom: 20px; display: flex; justify-content: center; pointer-events: none; z-index: 10")}>
          <div style={sx("pointer-events: auto; display: flex; align-items: center; gap: 10px; background: #3d3530; color: #ffffff; border-radius: 999px; padding: 8px 8px 8px 22px; box-shadow: 0 12px 28px rgba(60, 30, 40, 0.3)")}>
            <span style={sx("font-weight: 600; font-size: 14px; padding-right: 12px")}>Có thay đổi chưa lưu</span>
            <button type="button" onClick={() => base && setD(base)} disabled={saving} style={sx("border: 0; background: transparent; color: #ffffff; opacity: 0.8; border-radius: 999px; padding: 10px 12px; font-weight: 600")}>
              Huỷ
            </button>
            <button type="button" onClick={save} disabled={saving} style={sx("border: 0; background: #b3566f; color: #ffffff; border-radius: 999px; padding: 10px 20px; font-weight: 700" + (saving ? "; opacity: 0.75" : ""))}>
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      ) : null}
      {saved && !dirty ? (
        <div className="save-bar" style={sx("position: fixed; left: 0; right: 0; bottom: 20px; display: flex; justify-content: center; pointer-events: none; z-index: 10")}>
          <span role="status" style={sx("background: #e3efe6; color: #2f6b45; border-radius: 999px; padding: 12px 20px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 24px rgba(60, 90, 70, 0.2)")}>
            Đã lưu · trang bán hàng đã cập nhật
          </span>
        </div>
      ) : null}
    </Shell>
  );
}
