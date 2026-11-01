import { useEffect, useMemo, useState } from "react";
import { useNarrow } from "@/use-narrow";
import { api } from "@/api";
import { copyText, toast, useApp } from "@/app-state";
import { Avatar, CHIP, CloseX, ConfirmBlock, ContactPills, PinIcon, Search, Tabs } from "@/components/ui";
import { MobileHead, Shell } from "@/components/shell";
import { CN, ago, dots, dotsInput, fmt, itemLabel, norm, parseMoney, thisMonth, timeOf } from "@/format";
import { sx } from "@/sx";
import type { Order, OrderItem } from "@/types";
import "@/css/orders.css";

type Tab = "all" | "cho" | "xong";
const COUNTRIES: [string, string, string][] = [
  ["Nhật", "Nhật Bản", "#b3566f"],
  ["Hàn", "Hàn Quốc", "#d98aa0"],
  ["Úc", "Úc", "#c99a6a"],
  ["Trung", "Trung Quốc", "#c8b8b3"],
];
const st = (o: Order) => (o.status === "confirmed" ? "xong" : "cho");
const LABEL = { cho: "Chờ xử lý", xong: "Đã xác nhận" };
const ctyOf = (o: Order) => [...new Set(o.items.map((i) => i.country))];
const summaryOf = (o: Order) => o.items.map((i) => i.name + " ×" + i.qty).join(", ");
const monthNum = (m: string) => +m.slice(5);
const monthLabel = (m: string) => monthNum(m) + "/" + m.slice(0, 4);

/** Tin nhắn báo giá gửi khách (giống "Copy báo giá" của app gốc). */
export function quoteText(o: Order, store: string) {
  const L = [`Chào ${o.name || "bạn"} ♡ ${store} báo giá đơn #${o.code}:`];
  if (o.product) L.push("Nhu cầu: " + o.product);
  o.items.forEach((x) => L.push(`• ${itemLabel(x)} × ${x.qty} = ${x.price ? fmt(x.price * x.qty) : "đang báo giá"}`));
  if (o.shippingFee && o.subtotal) L.push("Phí giao: " + fmt(o.shippingFee));
  L.push("Tổng: " + (o.total ? fmt(o.total) : "đang cập nhật"));
  if (o.addr) L.push("Giao đến: " + o.addr);
  L.push("Bạn xác nhận giúp shop để shop đặt hàng nhé!");
  return L.join("\n");
}

/** Giá 1 dòng: bấm để báo giá / sửa giá. */
function PriceCell({ it, onSave }: { it: OrderItem; onSave: (price: number) => Promise<void> }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState("");
  if (edit)
    return (
      <span style={sx("position: relative; display: block; flex: 0 0 116px")}>
        <input
          autoFocus
          inputMode="numeric"
          placeholder="Giá 1 món"
          aria-label={"Giá 1 món " + it.name}
          value={v}
          onChange={(e) => setV(dotsInput(e.target.value))}
          onBlur={async () => {
            setEdit(false);
            const n = parseMoney(v);
            if (n !== it.price) await onSave(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEdit(false);
          }}
          style={sx("box-sizing: border-box; width: 100%; border: 1.5px solid #b3566f; background: #ffffff; border-radius: 10px; padding: 7px 22px 7px 10px; font: inherit; font-size: 14px; font-weight: 700; color: #a3546a; text-align: right")}
        />
        <span style={sx("position: absolute; right: 9px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 12px")}>đ</span>
      </span>
    );
  return (
    <button
      onClick={() => {
        setV(it.price ? dots(it.price) : "");
        setEdit(true);
      }}
      title={it.price ? "Sửa giá" : "Báo giá cho khách"}
      aria-label={(it.price ? "Sửa giá " : "Báo giá ") + it.name}
      className="price-edit"
      style={sx(
        "box-sizing: border-box; flex: 0 0 auto; text-align: right; border: 0; background: transparent; padding: 0; font-family: inherit; " +
          (it.price ? "font-weight: 700; color: #a3546a; font-size: 15px" : "font-size: 13px; color: #7d6862"),
      )}
    >
      {it.price ? fmt(it.price * it.qty) : "Chưa có giá"}
    </button>
  );
}

function Detail({ o, onClose, onChange }: { o: Order; onClose: () => void; onChange: (o: Order) => void }) {
  const { settings } = useApp();
  const [busy, setBusy] = useState(false);
  const s = st(o);
  const run = async (f: () => Promise<Order>) => {
    setBusy(true);
    try {
      onChange(await f());
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const needQuote = o.items.some((i) => !i.price);
  return (
    <section
      aria-label="Chi tiết đơn"
      className="detail-sheet"
      style={sx("flex: 1 1 380px; max-width: 460px; min-width: 0; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 10px 26px rgba(150, 90, 100, 0.14); display: flex; flex-direction: column")}
    >
      <div style={sx("padding: 18px 20px 14px; border-bottom: 1px solid #efd9d3; display: flex; flex-direction: column; gap: 6px")}>
        <div style={sx("display: flex; align-items: center; gap: 10px; flex-wrap: wrap")}>
          <span style={sx("font-weight: 800; color: #a3546a; letter-spacing: 0.5px")}>ĐƠN #{o.code}</span>
          <span style={sx("box-sizing: border-box; " + CHIP[s])}>{LABEL[s]}</span>
          {o.paid ? <span style={sx(CHIP.xong)}>Khách báo đã CK</span> : null}
          <span style={{ flex: 1 }}></span>
          <CloseX onClick={onClose} label="Đóng đơn hàng" />
        </div>
        <div style={sx("display: flex; align-items: center; gap: 12px; padding: 4px 0")}>
          <Avatar src={o.avatar} name={o.name} size={56} font={20} />
          <span style={sx("flex: 1; min-width: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 20px")}>{o.name || "Khách"}</span>
          <span style={sx("font-size: 13px; color: #7d6862; white-space: nowrap; text-align: right")}>{timeOf(o.createdAt)}</span>
        </div>
        <ContactPills phone={o.phone} />
        {o.addr ? (
          <span style={sx("display: flex; gap: 8px; font-size: 14px; color: #3d3530")}>
            <PinIcon />
            {o.addr}
          </span>
        ) : null}
      </div>

      <div style={sx("padding: 6px 20px 4px; display: flex; flex-direction: column")}>
        {o.items.map((it, k) => (
          <div key={k} style={sx("display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #efd9d3")}>
            <img src={it.img} alt="" style={sx("width: 52px; height: 52px; flex: 0 0 52px; border-radius: 12px; border: 1px solid #efd9d3; background: #ffffff; object-fit: contain")} />
            <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px")}>
              <span style={sx("font-size: 14px; font-weight: 600; line-height: 1.3")}>{itemLabel(it)}</span>
              <span style={sx("font-size: 12.5px; color: #7d6862")}>
                {it.country} · SL {it.qty}
              </span>
            </span>
            <PriceCell it={it} onSave={(price) => run(() => api.updateItem(o.code, k, { price }))} />
          </div>
        ))}
        {o.note ? <p style={sx("margin: 12px 0 0; font-size: 14px; background: #f6e1dc; color: #6e3346; border-radius: 12px; padding: 10px 12px")}>Ghi chú: {o.note}</p> : null}
      </div>

      <div style={sx("padding: 14px 20px 20px; display: flex; flex-direction: column; gap: 12px")}>
        {o.shippingFee && o.subtotal ? (
          <div style={sx("display: flex; justify-content: space-between; font-size: 14px; color: #6f5a55")}>
            <span>Phí giao hàng</span>
            <span>{fmt(o.shippingFee)}</span>
          </div>
        ) : null}
        <div style={sx("display: flex; justify-content: space-between; align-items: baseline")}>
          <span style={sx("font-weight: 700")}>Tổng cộng</span>
          <span style={sx("font-size: 24px; font-weight: 700; color: #a3546a")}>{o.total ? fmt(o.total) : "—"}</span>
        </div>
        <ConfirmBlock pending={s === "cho"} busy={busy} what="đơn" onToggle={() => run(() => api.confirm(o.code, s === "cho"))} />
        <button
          onClick={() => copyText(quoteText(o, settings?.store || "MT store"), "Đã sao chép tin nhắn báo giá")}
          style={sx("align-self: center; border: 0; background: transparent; color: #a3546a; font-weight: 600; font-size: 13px; padding: 4px 2px")}
        >
          {needQuote ? "Còn món chưa có giá · " : ""}Sao chép tin nhắn báo giá
        </button>
      </div>
    </section>
  );
}

/** Thẻ đơn trên điện thoại (bản "Điện thoại – Đơn hàng"). */
function MobileCard({ o, onOpen, onToggle }: { o: Order; onOpen: () => void; onToggle: () => void }) {
  const s = st(o);
  const tel = o.phone.replace(/[^0-9+]/g, "");
  return (
    <article style={sx("background: #fffaf7; border: 1px solid #efd9d3; border-radius: 20px; padding: 14px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; gap: 8px")}>
      <button onClick={onOpen} style={sx("display: flex; flex-direction: column; gap: 8px; border: 0; background: transparent; padding: 0; color: inherit; text-align: left")}>
        <span style={sx("display: flex; align-items: center; gap: 8px; width: 100%")}>
          <span style={sx("font-size: 13px; font-weight: 800; color: #a3546a; letter-spacing: 0.4px")}>#{o.code}</span>
          <span style={sx("font-size: 12px; color: #7d6862; flex: 1")}>{ago(o.createdAt)} trước</span>
          <span style={sx("box-sizing: border-box; font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 2px 9px; " + (s === "cho" ? "background: #f6e1dc; color: #8f4459" : "background: #e3efe6; color: #2f6b45"))}>{LABEL[s]}</span>
        </span>
        <span style={sx("display: flex; align-items: center; gap: 10px; width: 100%")}>
          <Avatar src={o.avatar} name={o.name} size={46} />
          <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column")}>
            <b style={sx("font-size: 15px")}>{o.name || "Khách"}</b>
            <span style={sx("font-size: 13px; color: #7d6862; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{summaryOf(o)}</span>
          </span>
          <span style={sx("display: flex")}>
            {o.items.slice(0, 2).map((it, k) => (
              <img key={k} src={it.img} alt="" style={sx("width: 36px; height: 36px; border-radius: 10px; border: 2px solid #fffaf7; background: #ffffff; object-fit: contain; margin-left: -8px")} />
            ))}
          </span>
        </span>
      </button>
      <div style={sx("display: flex; align-items: center; gap: 8px; border-top: 1px dashed #efd9d3; padding-top: 10px")}>
        <span style={sx("flex: 1; font-weight: 700; color: #a3546a; font-size: 16px")}>{s === "xong" && o.total ? fmt(o.total) : ""}</span>
        {tel ? (
          <a href={"tel:" + tel} aria-label="Gọi khách" style={sx("width: 44px; height: 44px; border-radius: 12px; border: 1px solid #efd9d3; background: #ffffff; display: flex; align-items: center; justify-content: center")}>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path>
            </svg>
          </a>
        ) : null}
        <button
          onClick={onToggle}
          style={sx("box-sizing: border-box; height: 44px; display: flex; align-items: center; border-radius: 12px; padding: 0 16px; font-weight: 700; font-size: 14px; border: 0; " + (s === "cho" ? "background: #b3566f; color: #ffffff" : "background: #e3efe6; color: #2f6b45"))}
        >
          {s === "cho" ? "Xác nhận đơn" : "Đã xác nhận"}
        </button>
      </div>
    </article>
  );
}

export default function Orders() {
  const { tick, refresh, badges, settings } = useApp();
  const [months, setMonths] = useState<string[]>([thisMonth()]);
  const [month, setMonth] = useState(thisMonth());
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [sel, setSel] = useState<string | null>(null);
  // null = theo Cài đặt › "Ẩn doanh thu khi mở trang" cho tới khi bấm con mắt.
  const [revPick, setRevPick] = useState<boolean | null>(null);
  const showRev = revPick ?? !settings?.prefs?.hideRev;
  const setShowRev = (v: boolean) => setRevPick(v);
  const [country, setCountry] = useState<string | null>(null);
  const [sumOpen, setSumOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mSearch, setMSearch] = useState(false);
  const mobile = useNarrow();

  useEffect(() => {
    api
      .months()
      .then((m) => setMonths([...new Set([thisMonth(), ...m])].sort().reverse().slice(0, 3).reverse()))
      .catch(() => {});
  }, [tick]);
  useEffect(() => {
    let live = true;
    api
      .orders({ kind: "order", month })
      .then((l) => live && setOrders(l))
      .catch((e) => toast((e as Error).message));
    return () => {
      live = false;
    };
  }, [month, tick]);

  const all = orders ?? [];
  const searched = q ? all.filter((o) => norm([o.code, o.name, o.phone, o.addr, o.note, ...o.items.map((i) => i.name)].join(" ")).includes(norm(q))) : all;
  const T: [Tab, string, (o: Order) => boolean][] = [
    ["all", "Tất cả", () => true],
    ["cho", "Chờ xử lý", (o) => st(o) === "cho"],
    ["xong", "Đã xác nhận", (o) => st(o) === "xong"],
  ];
  const cur = T.find((t) => t[0] === tab)!;
  const list = searched.filter(cur[2]).filter((o) => !country || ctyOf(o).includes(country));

  useEffect(() => {
    if (!mobile && !sel && list.length) setSel(list[0].code);
  }, [orders, mobile]);

  const confirmed = all.filter((o) => st(o) === "xong");
  const revenue = confirmed.reduce((a, o) => a + o.total, 0);
  const byCountry = COUNTRIES.map(([key, name, col]) => {
    const os = all.filter((o) => ctyOf(o).includes(key));
    const rev = os.filter((o) => st(o) === "xong").reduce((n, o) => n + o.items.filter((i) => i.country === key).reduce((m, i) => m + i.price * i.qty, 0), 0);
    return { key, name, col, orders: os.length, rev };
  });

  const sum = useMemo(() => {
    const agg: Record<string, { name: string; img: string; qty: number; tones: Record<string, number>; country: string }> = {};
    confirmed.forEach((o) =>
      o.items.forEach((it) => {
        const a = (agg[it.productId] ||= { name: it.name, img: it.img, qty: 0, tones: {}, country: COUNTRIES.some((c) => c[0] === it.country) ? it.country : "Khác" });
        a.qty += it.qty;
        if (it.variantName) a.tones[it.variantName] = (a.tones[it.variantName] || 0) + it.qty;
      }),
    );
    const items = Object.values(agg)
      .sort((x, y) => y.qty - x.qty)
      .map((a) => ({
        ...a,
        tones: Object.entries(a.tones).map(([t, q]) => (a.qty === q && Object.keys(a.tones).length === 1 ? "Tone " + t : t + " ×" + q)),
      }));
    const groups = ["Nhật", "Hàn", "Úc", "Trung", "Khác"]
      .map((c) => {
        const g = items.filter((s) => s.country === c);
        return { country: CN[c] || c, items: g, qty: g.reduce((n, s) => n + s.qty, 0) + " sản phẩm" };
      })
      .filter((g) => g.items.length);
    return { groups, qty: items.reduce((n, s) => n + s.qty, 0), empty: !items.length };
  }, [orders]);

  const selO = all.find((o) => o.code === sel) || null;
  const replace = (u: Order) => {
    setOrders((l) => (l ? l.map((x) => (x.code === u.code ? u : x)) : l));
    refresh();
  };
  const toggle = async (o: Order) => {
    try {
      replace(await api.confirm(o.code, st(o) === "cho"));
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const ml = monthLabel(month);
  /** Bỏ lọc nước: về tháng hiện tại (như thiết kế). */
  const clearCountry = () => {
    setCountry(null);
    if (month !== thisMonth()) {
      setMonth(thisMonth());
      setSel(null);
    }
  };

  return (
    <Shell variant="scroll">
      <main className="main-pad orders-main" style={sx("flex: 999 1 560px; min-width: 0; height: 100%; overflow-y: auto; box-sizing: border-box; padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 22px")}>
        <MobileHead
          title="Đơn hàng"
          sub={badges.pendingOrders + " đơn chờ xử lý"}
          action={
            <button
              onClick={() => setMSearch(!mSearch)}
              aria-label="Tìm đơn"
              style={sx("width: 44px; height: 44px; border-radius: 50%; border: 1px solid #efd9d3; background: #ffffff; color: #a3546a; display: flex; align-items: center; justify-content: center")}
            >
              <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m20 20-3.5-3.5"></path>
              </svg>
            </button>
          }
        />
        <div className={mSearch ? undefined : "only-desktop"} style={sx("display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between")}>
          <div className="only-desktop" style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 16px")}>
            <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>Đơn hàng</h1>
          </div>
          <span className={mSearch ? undefined : "only-desktop"} style={sx("display: flex; flex: 0 1 340px; min-width: 220px")}>
            <Search label="Tìm đơn" placeholder="Tìm mã đơn, tên, số điện thoại…" value={q} onChange={setQ} flex="1 1 auto" />
          </span>
        </div>

        <div style={sx("display: flex; flex-wrap: wrap; gap: 14px; align-items: stretch")}>
          <div style={sx("flex: 1 1 320px; max-width: 420px; background: #b3566f; color: #ffffff; border-radius: 20px; padding: 16px 20px; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.20); display: flex; flex-direction: column; justify-content: center; gap: 6px")}>
            <div style={sx("display: flex; align-items: center; gap: 8px")}>
              <span style={sx("font-size: 13px; font-weight: 600")}>Doanh thu tháng {ml}</span>
              <button
                onClick={() => setShowRev(!showRev)}
                aria-label={showRev ? "Ẩn doanh thu" : "Hiện doanh thu"}
                aria-pressed={!showRev}
                style={sx("width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.16); color: #ffffff; display: inline-flex; align-items: center; justify-content: center; padding: 0")}
              >
                {showRev ? (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3l18 18"></path>
                    <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2"></path>
                    <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"></path>
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
                  </svg>
                )}
              </button>
              <span style={{ flex: 1 }}></span>
            </div>
            <span style={sx("font-size: 34px; font-weight: 700; line-height: 1.1; letter-spacing: 0.2px")}>{showRev ? fmt(revenue) : "•••••••• đ"}</span>
          </div>
          <div style={sx("flex: 999 1 460px; min-width: 0; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 20px; padding: 14px 18px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; gap: 10px")}>
            <div style={sx("display: flex; align-items: center; justify-content: space-between; gap: 8px")}>
              <span style={sx("font-size: 13px; font-weight: 700; color: #6f5a55")}>Lịch sử đơn theo nước · tháng {ml} · bấm một nước để xem đơn</span>
              {country ? (
                <button onClick={clearCountry} style={sx("border: 0; background: transparent; color: #a3546a; font-size: 13px; font-weight: 600; padding: 4px 2px")}>
                  Xem tất cả
                </button>
              ) : null}
            </div>
            <div className="cty-grid" style={sx("display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px")}>
              {byCountry.map((c) => {
                const on = country === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      if (on) clearCountry();
                      else setCountry(c.key);
                      setTab("all");
                    }}
                    aria-pressed={on}
                    style={sx(
                      "box-sizing: border-box; font: inherit; color: inherit; text-align: left; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; " +
                        (on ? "background: #fbe7ec; border: 2px solid #b3566f" : "background: #ffffff; border: 2px solid #efd9d3"),
                    )}
                  >
                    <span style={sx("display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #8f4459")}>
                      <span style={sx("box-sizing: border-box; width: 8px; height: 8px; border-radius: 50%; background: " + c.col)}></span>
                      {c.name}
                    </span>
                    <span style={sx("font-size: 22px; font-weight: 700; line-height: 1.2")}>
                      {c.orders} <span style={sx("font-size: 13px; font-weight: 600; color: #7d6862")}>đơn</span>
                    </span>
                    <span style={sx("font-size: 12.5px; color: #7d6862")}>{!showRev ? "•••••• đ" : c.rev ? fmt(c.rev) : c.orders ? "Chưa xác nhận" : "Chưa có đơn"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section aria-label="Tổng sản phẩm khách đặt" style={sx("flex-shrink: 0; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 20px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; overflow: hidden")}>
          <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 16px")}>
            <span style={sx("width: 36px; height: 36px; flex: 0 0 36px; border-radius: 12px; background: #f6e1dc; color: #a3546a; display: flex; align-items: center; justify-content: center")}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5h10M9 12h10M9 19h10"></path>
                <path d="M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2"></path>
              </svg>
            </span>
            <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 17px; color: #a3546a")}>Tổng sản phẩm khách đặt</span>
            <span style={sx("display: flex; gap: 6px; flex-wrap: wrap; flex: 1")}>
              <span style={sx("background: #b3566f; color: #ffffff; border-radius: 999px; padding: 2px 10px; font-size: 12.5px; font-weight: 700")}>{sum.qty} sản phẩm</span>
            </span>
            <button
              onClick={() => setSumOpen(!sumOpen)}
              aria-expanded={sumOpen}
              style={sx("display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: #a3546a; border-radius: 999px; padding: 8px 10px; font-weight: 600; font-size: 13.5px")}
            >
              {sumOpen ? "Thu gọn" : "Xem"}
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 12 12" style={sumOpen ? { transform: "rotate(180deg)" } : undefined}>
                <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </button>
          </div>
          {sumOpen ? (
            <div style={sx("border-top: 1px solid #efd9d3; padding: 6px 16px 12px; display: flex; flex-direction: column; gap: 4px")}>
              {sum.groups.map((g) => (
                <div key={g.country} style={sx("display: flex; flex-direction: column")}>
                  <span style={sx("font-size: 12px; font-weight: 700; color: #7d6862; letter-spacing: 0.6px; text-transform: uppercase; padding: 8px 0 4px")}>
                    {g.country} · {g.qty}
                  </span>
                  <div style={sx("display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); column-gap: 24px")}>
                    {g.items.map((s) => (
                      <div key={s.name} style={sx("display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #efd9d3")}>
                        <span style={sx("flex: 0 0 36px; text-align: right; font-size: 17px; font-weight: 700; color: #a3546a")}>{s.qty}×</span>
                        <img src={s.img} alt="" style={sx("width: 32px; height: 32px; flex: 0 0 32px; border-radius: 8px; object-fit: contain; background: #ffffff; border: 1px solid #efd9d3")} />
                        <span style={sx("flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{s.name}</span>
                        <span style={sx("display: flex; gap: 4px; flex: 0 0 auto")}>
                          {s.tones.map((t) => (
                            <span key={t} style={sx("font-size: 11.5px; font-weight: 600; background: #f6e1dc; color: #8f4459; border-radius: 6px; padding: 1px 6px; white-space: nowrap")}>
                              {t}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {sum.empty ? <p style={sx("margin: 0; padding: 10px 0; color: #7d6862; font-size: 14px")}>Chưa có đơn nào được xác nhận. Bấm “Xác nhận đã nhận đơn” để cộng sản phẩm vào đây.</p> : null}
            </div>
          ) : null}
        </section>

        <div style={sx("display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start")}>
          <section aria-label="Danh sách đơn" style={sx("flex: 999 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 12px")}>
            <h2 className="only-desktop" style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #3d3530")}>
              Đơn tháng {ml} <span style={sx("font-family: 'Be Vietnam Pro', sans-serif; font-size: 13.5px; font-weight: 600; color: #7d6862")}>· {all.length} đơn</span>
            </h2>
            <span className="only-desktop">
              <Tabs tabs={T.map(([id, l, f]) => [id, l, searched.filter(f).length])} value={tab} onPick={setTab} />
            </span>
            <div className="only-mobile orders-mtabs" style={sx("display: flex; gap: 8px; overflow-x: auto")}>
              {T.map(([id, l]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={sx(
                    "box-sizing: border-box; flex: 0 0 auto; min-height: 40px; border-radius: 999px; padding: 8px 14px; font-weight: 600; font-size: 13.5px; white-space: nowrap; " +
                      (id === tab ? "border: 1.5px solid #b3566f; background: #b3566f; color: #ffffff" : "border: 1px solid #efd9d3; background: #fffaf7; color: #6f5a55"),
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            {country ? (
              <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: #fbe7ec; border: 1px solid #e8c3cd; border-radius: 14px; padding: 10px 14px")}>
                <span style={sx("flex: 1; font-size: 14px; color: #6e3346")}>
                  Đang xem đơn có hàng <b>{CN[country]}</b> · {list.length} đơn
                </span>
                <div role="group" aria-label="Xem lịch sử theo tháng" style={sx("display: flex; gap: 4px; background: #ffffff; border: 1px solid #e8c3cd; border-radius: 999px; padding: 3px")}>
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMonth(m);
                        setSel(null);
                      }}
                      aria-pressed={m === month}
                      style={sx("box-sizing: border-box; border: 0; border-radius: 999px; padding: 7px 14px; font-weight: 600; font-size: 13.5px; " + (m === month ? "background: #b3566f; color: #ffffff" : "background: transparent; color: #8f4459"))}
                    >
                      Tháng {monthNum(m)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={clearCountry}
                  aria-label="Bỏ lọc theo nước"
                  style={sx("display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e8c3cd; background: #ffffff; color: #a3546a; border-radius: 999px; padding: 6px 12px; font-weight: 600; font-size: 13px")}
                >
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18"></path>
                  </svg>
                  Bỏ lọc
                </button>
              </div>
            ) : null}
            <div className="only-desktop" style={sx("background: rgba(255, 250, 247, 0.85); border: 1px solid #efd9d3; border-radius: 22px; padding: 8px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; gap: 4px")}>
              {list.map((o) => {
                const s = st(o);
                return (
                  <button
                    key={o.code}
                    className={o.code === sel ? undefined : "row-btn"}
                    onClick={() => setSel(o.code)}
                    style={sx(
                      "box-sizing: border-box; display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border-radius: 16px; font: inherit; color: inherit; " +
                        (o.code === sel ? "background: #fbe7ec; border: 1.5px solid #b3566f" : "background: transparent; border: 1.5px solid transparent") +
                        (s === "xong" ? "; opacity: 0.72" : ""),
                    )}
                  >
                    <Avatar src={o.avatar} name={o.name} size={44} />
                    <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; text-align: left")}>
                      <span style={sx("display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap")}>
                        <b style={sx("font-size: 15px")}>{o.name || "Khách"}</b>
                        <span style={sx("font-size: 12.5px; color: #a3546a; font-weight: 700; letter-spacing: 0.4px")}>#{o.code}</span>
                      </span>
                      <span style={sx("font-size: 13.5px; color: #7d6862; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{summaryOf(o)}</span>
                    </span>
                    <span style={sx("display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 0 0 auto")}>
                      <b style={sx("font-size: 15px; color: #3d3530")}>{s === "xong" ? (o.total ? fmt(o.total) : "—") : ""}</b>
                      <span style={sx("box-sizing: border-box; " + CHIP[s])}>{LABEL[s]}</span>
                    </span>
                    <span style={sx("font-size: 12.5px; color: #7d6862; flex: 0 0 76px; text-align: right")}>{ago(o.createdAt)}</span>
                  </button>
                );
              })}
              {!list.length ? <p style={sx("margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>{orders ? "Không có đơn nào trong mục này." : "Đang tải đơn…"}</p> : null}
            </div>
            <div className="only-mobile" style={sx("flex-direction: column; gap: 12px")}>
              {list.map((o) => (
                <MobileCard key={o.code} o={o} onOpen={() => setSel(o.code)} onToggle={() => toggle(o)} />
              ))}
              {!list.length ? <p style={sx("margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>{orders ? "Không có đơn nào trong mục này." : "Đang tải đơn…"}</p> : null}
            </div>
          </section>
          {selO ? <Detail key={selO.code} o={selO} onClose={() => setSel(null)} onChange={replace} /> : null}
        </div>
      </main>
    </Shell>
  );
}
