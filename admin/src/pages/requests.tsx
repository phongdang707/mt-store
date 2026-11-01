import { useEffect, useState } from "react";
import { useNarrow } from "@/use-narrow";
import { api } from "@/api";
import { copyText, toast, useApp } from "@/app-state";
import { Avatar, BlockCustomer, CHIP, CloseX, ConfirmBlock, ContactPills, PinIcon, Search, Tabs } from "@/components/ui";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { ago, dots, dotsInput, fmt, itemLabel, norm, parseMoney, timeOf } from "@/format";
import { sx } from "@/sx";
import type { Order } from "@/types";

/** Tin nhắn báo giá gửi khách (giống "Copy báo giá" của app gốc). */
function quoteText(o: Order, store: string) {
  const L = [`Chào ${o.name || "bạn"} ♡ ${store} báo giá yêu cầu #${o.code}:`];
  if (o.product) L.push("Nhu cầu: " + o.product);
  o.items.forEach((x) => L.push(`• ${itemLabel(x)} × ${x.qty} = ${x.price ? fmt(x.price * x.qty) : "đang báo giá"}`));
  if (o.shippingFee && o.subtotal) L.push("Phí giao: " + fmt(o.shippingFee));
  L.push("Tổng: " + (o.total ? fmt(o.total) : "đang cập nhật"));
  if (o.addr) L.push("Giao đến: " + o.addr);
  L.push("Bạn xác nhận giúp shop để shop đặt hàng nhé!");
  return L.join("\n");
}

type Tab = "all" | "cho" | "xong";
const st = (o: Order) => (o.status === "confirmed" ? "xong" : "cho");
const LABEL = { cho: "Chờ xử lý", xong: "Đã xác nhận" };

function Detail({ r, onChange, onClose, onBlocked }: { r: Order; onChange: (o: Order) => void; onClose: () => void; onBlocked: (blocked: boolean) => void }) {
  const { settings } = useApp();
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(r.quoteTotal ? dots(r.quoteTotal) : "");
  const s = st(r);
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
  const saveQuote = () => {
    const n = parseMoney(quote);
    if (n !== r.quoteTotal) run(() => api.updateOrder(r.code, { quoteTotal: n })).then(() => toast(n ? "Đã lưu giá báo · khách thấy trong “Đơn của bạn”" : "Đã xoá giá báo"));
  };
  return (
    <section
      aria-label="Chi tiết yêu cầu"
      className="detail-sheet"
      style={sx("flex: 1 1 380px; max-width: 460px; min-width: 0; background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 10px 26px rgba(150, 90, 100, 0.14); display: flex; flex-direction: column")}
    >
      <div style={sx("padding: 18px 20px 14px; border-bottom: 1px solid #efd9d3; display: flex; flex-direction: column; gap: 8px")}>
        <div style={sx("display: flex; align-items: center; gap: 10px")}>
          <span style={sx("font-weight: 800; color: #a3546a; letter-spacing: 0.5px")}>YÊU CẦU #{r.code}</span>
          <span style={sx("box-sizing: border-box; " + CHIP[s])}>{LABEL[s]}</span>
          <span style={{ flex: 1 }}></span>
          <span style={sx("font-size: 12.5px; color: #7d6862")}>{timeOf(r.createdAt)}</span>
          <span className="only-mobile">
            <CloseX onClick={onClose} label="Đóng yêu cầu" />
          </span>
        </div>
        <div style={sx("display: flex; align-items: center; gap: 12px; padding: 4px 0")}>
          <Avatar src={r.avatar} name={r.name} size={56} font={20} />
          <span style={sx("display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0")}>
            <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 20px")}>{r.name || "Khách"}</span>
            {r.blocked ? <span style={sx(CHIP.chan)}>Đã chặn</span> : null}
          </span>
        </div>
        <ContactPills phone={r.phone} />
        {r.addr ? (
          <span style={sx("display: flex; gap: 8px; font-size: 14px")}>
            <PinIcon />
            {r.addr}
          </span>
        ) : null}
      </div>

      <div style={sx("padding: 16px 20px; display: flex; flex-direction: column; gap: 12px")}>
        <span style={sx("font-size: 13px; font-weight: 600; color: #6f5a55")}>Khách cần tìm</span>
        <b style={sx("font-size: 16px; line-height: 1.4")}>{r.product}</b>
        <div style={sx("display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px")}>
          {r.photos.map((ph, i) => (
            <a key={i} href={ph} target="_blank" rel="noopener" style={sx("display: block; aspect-ratio: 1; border-radius: 14px; overflow: hidden; border: 1px solid #efd9d3; background: #ffffff")}>
              <img src={ph} alt="Ảnh khách gửi" style={sx("width: 100%; height: 100%; object-fit: cover; display: block")} />
            </a>
          ))}
        </div>
        {r.note ? <p style={sx("margin: 0; font-size: 14px; background: #f6e1dc; color: #6e3346; border-radius: 12px; padding: 10px 12px")}>Ghi chú: {r.note}</p> : null}
        <label style={sx("display: flex; flex-direction: column; gap: 6px")}>
          <span style={sx("font-size: 13px; font-weight: 700; color: #a3546a")}>Giá báo cho khách</span>
          <span style={sx("position: relative; display: block")}>
            <input
              inputMode="numeric"
              placeholder="Nhập giá"
              value={quote}
              onChange={(e) => setQuote(dotsInput(e.target.value))}
              onBlur={saveQuote}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              style={sx("box-sizing: border-box; width: 100%; border: 1.5px solid #b3566f; background: #ffffff; border-radius: 12px; padding: 11px 28px 11px 12px; font: inherit; font-weight: 700; font-size: 16px; color: #a3546a")}
            />
            <span style={sx("position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #7d6862; font-size: 13px")}>đ</span>
          </span>
          <span style={sx("font-size: 12px; color: #7d6862")}>
            {r.total && r.shippingFee ? `Khách thấy tổng ${dots(r.total)}đ (gồm phí giao ${dots(r.shippingFee)}đ)` : r.total ? "Khách thấy giá này trong “Đơn của bạn”" : "Tìm được hàng thì nhập giá · khách thấy trong “Đơn của bạn”"}
          </span>
        </label>
        <button
          onClick={() => copyText(quoteText(r, settings?.store || "MT store"), "Đã sao chép tin nhắn báo giá")}
          style={sx("align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: #a3546a; font-weight: 600; font-size: 13.5px; padding: 6px 2px")}
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2"></rect>
            <path d="M5 15V5a1 1 0 0 1 1-1h10"></path>
          </svg>
          Copy báo giá
        </button>
      </div>

      <div style={sx("padding: 4px 20px 20px; display: flex; flex-direction: column; gap: 10px")}>
        <ConfirmBlock pending={s === "cho"} busy={busy} what="yêu cầu" onToggle={() => run(() => api.confirm(r.code, s === "cho"))} />
        {r.customer ? <BlockCustomer id={r.customer} blocked={r.blocked} onChange={onBlocked} /> : null}
      </div>
    </section>
  );
}

export default function Requests() {
  const { tick, refresh, badges } = useApp();
  const [all, setAll] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const narrow = useNarrow();

  useEffect(() => {
    api
      .orders({ kind: "request" })
      .then(setAll)
      .catch((e) => toast((e as Error).message));
  }, [tick]);
  useEffect(() => {
    if (narrow || sel || !all?.length) return;
    setSel(all[0].code);
  }, [narrow, all, sel]);

  const list0 = all ?? [];
  const searched = q ? list0.filter((r) => norm([r.code, r.name, r.phone, r.product, r.note].join(" ")).includes(norm(q))) : list0;
  const T: [Tab, string, (r: Order) => boolean][] = [
    ["all", "Tất cả", () => true],
    ["cho", "Chờ xử lý", (r) => st(r) === "cho"],
    ["xong", "Đã xác nhận", (r) => st(r) === "xong"],
  ];
  const list = searched.filter(T.find((t) => t[0] === tab)![2]);
  const selR = list0.find((r) => r.code === sel);

  return (
    <Shell>
      <main className="main-pad" style={sx(MAIN.scroll)}>
        <MobileHead title="Yêu cầu tìm hộ" sub={badges.pendingRequests + " yêu cầu chờ xử lý"} />
        <div style={sx("display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between")}>
          <div className="only-desktop" style={sx("display: flex; flex-direction: column; gap: 2px")}>
            <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>Yêu cầu tìm hộ</h1>
            <span style={sx("color: #7d6862; font-size: 14px")}>Khách gửi ảnh món chưa có trên trang, nhờ shop tìm giúp</span>
          </div>
          <Search label="Tìm yêu cầu" placeholder="Tìm tên khách, món cần tìm…" value={q} onChange={setQ} />
        </div>
        <Tabs tabs={T.map(([id, l, f]) => [id, l, searched.filter(f).length])} value={tab} onPick={setTab} />
        <div style={sx("display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start")}>
          <section aria-label="Danh sách yêu cầu" style={sx("flex: 999 1 440px; min-width: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px")}>
            {list.map((r) => {
              const s = st(r);
              return (
                <button
                  key={r.code}
                  onClick={() => setSel(r.code)}
                  style={sx(
                    "box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: 10px; border-radius: 20px; font: inherit; color: inherit; background: rgba(255, 250, 247, 0.9); box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); " +
                      (r.code === sel ? "border: 2px solid #b3566f" : "border: 2px solid #efd9d3") +
                      (s === "xong" ? "; opacity: 0.75" : ""),
                  )}
                >
                  <span style={sx("display: block; position: relative; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; background: #ffffff")}>
                    {r.photos[0] ? <img src={r.photos[0]} alt="" loading="lazy" style={sx("width: 100%; height: 100%; object-fit: cover; display: block")} /> : null}
                    <span style={sx("position: absolute; right: 8px; bottom: 8px; background: rgba(61, 53, 48, 0.72); color: #ffffff; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 2px 9px")}>{r.photos.length} ảnh</span>
                  </span>
                  <span style={sx("font-size: 14.5px; font-weight: 600; line-height: 1.35; text-align: left; min-height: 2.7em")}>{r.product}</span>
                  <span style={sx("display: flex; align-items: center; gap: 8px")}>
                    <Avatar src={r.avatar} name={r.name} size={30} ring={false} font={13} />
                    <span style={sx("flex: 1; text-align: left; font-size: 13.5px; font-weight: 600")}>{r.name || "Khách"}</span>
                    <span style={sx("box-sizing: border-box; " + CHIP[s])}>{LABEL[s]}</span>
                  </span>
                  <span style={sx("font-size: 12.5px; color: #7d6862; text-align: left")}>{ago(r.createdAt)} trước</span>
                </button>
              );
            })}
            {!list.length ? <p style={sx("grid-column: 1 / -1; margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>{all ? "Chưa có yêu cầu nào trong mục này." : "Đang tải yêu cầu…"}</p> : null}
          </section>
          {selR ? (
            <Detail
              key={selR.code}
              r={selR}
              onClose={() => setSel(null)}
              onChange={(u) => {
                setAll((l) => l && l.map((x) => (x.code === u.code ? u : x)));
                refresh();
              }}
              onBlocked={(blocked) => {
                const id = selR.customer;
                setAll((l) => l && l.map((x) => (id && x.customer === id ? { ...x, blocked } : x)));
              }}
            />
          ) : null}
        </div>
      </main>
    </Shell>
  );
}
