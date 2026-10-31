import { useEffect, useRef, useState } from "react";
import { api } from "@/api";
import { copyText, toast, useApp } from "@/app-state";
import { Avatar, CloseX, Search, Segmented } from "@/components/ui";
import { Paper } from "@/components/paper";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { ddmm, fmt, hhmm, norm, zaloOf } from "@/format";
import { orderImage } from "@/invoice-image";
import { sx } from "@/sx";
import "@/css/invoices.css";
import type { InvoiceVia, Order, Product } from "@/types";

type F = "all" | "todo" | "sent";
const CH = {
  new: ["Chưa gửi", "background: #fdecc8; color: #7a4f00"],
  changed: ["Có thay đổi", "background: #fbe7ec; color: #8f4459"],
  sent: ["Đã gửi", "background: #e3efe6; color: #2f6b45"],
} as const;
const VIA: Record<InvoiceVia, string> = { zalo: "Zalo", messenger: "Messenger", link: "đường link", png: "ảnh tải về" };
const at = (iso: string) => {
  const d = new Date(iso);
  return ddmm(d) + " " + hhmm(d);
};
const SEND_OPTS: [InvoiceVia, string, string, string][] = [
  ["zalo", "Zalo", "Gửi qua Zalo", "Gửi ảnh hoá đơn qua Zalo của khách"],
  ["messenger", "Mes", "Gửi qua Messenger", "Gửi ảnh hoá đơn qua Messenger"],
  ["link", "Link", "Sao chép link", "Sao chép link hoá đơn để dán vào tin nhắn"],
  ["png", "PNG", "Tải ảnh hoá đơn", "Tải hoá đơn về máy dạng ảnh"],
];

export const invoiceLink = (o: Order) => `${location.origin}/hd/${o.token}`;

function download(b: Blob, name: string) {
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

interface Opt {
  key: string;
  productId: string;
  variant?: number;
  name: string;
  img: string;
}

export default function Invoices() {
  const { tick, refresh, settings } = useApp();
  const [all, setAll] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<F>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [adding, setAdding] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [pq, setPq] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .orders({ kind: "order", status: "confirmed" })
      .then((l) => {
        setAll(l);
        if (!sel && l.length && !matchMedia("(max-width: 760px)").matches) setSel(l[0].code);
      })
      .catch((e) => toast((e as Error).message));
  }, [tick]);
  useEffect(() => {
    if (adding && !products) api.products().then(setProducts).catch(() => {});
  }, [adding]);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [menu]);

  const list0 = all ?? [];
  const Fs: [F, string, (o: Order) => boolean][] = [
    ["all", "Tất cả", () => true],
    ["todo", "Cần gửi", (o) => o.invoiceStatus !== "sent"],
    ["sent", "Đã gửi", (o) => o.invoiceStatus === "sent"],
  ];
  const list = list0.filter(Fs.find((f) => f[0] === filter)![2]);
  const cur = list0.find((o) => o.code === sel) || null;
  const shop = {
    store: settings?.store || "MT store",
    tagline: settings?.tagline || "",
    zalo: settings?.zalo || "",
    bank: settings?.bank || { bank: "", bin: "", acc: "", name: "" },
    qr: settings?.qr || "",
    logo: settings?.logo || "",
  };

  const replace = (u: Order) => {
    setAll((l) => l && l.map((x) => (x.code === u.code ? u : x)));
    refresh();
  };
  const run = async (f: () => Promise<Order>) => {
    setBusy(true);
    try {
      replace(await f());
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = async (via: InvoiceVia) => {
    if (!cur) return;
    setMenu(false);
    const name = "hoa-don-" + cur.code + ".png";
    const png = via === "link" ? null : await orderImage(cur, shop).catch(() => null);
    const file = png ? new File([png], name, { type: "image/png" }) : null;
    if (via === "link") copyText(invoiceLink(cur), "Đã sao chép link hoá đơn");
    else if (via === "png") {
      if (file) download(file, name);
    } else {
      let shared = false;
      try {
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: "Hoá đơn " + shop.store + " #" + cur.code + "\n" + invoiceLink(cur) });
          shared = true;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
      if (!shared) {
        if (file) download(file, name);
        try {
          await navigator.clipboard.writeText(invoiceLink(cur));
        } catch {}
        const z = zaloOf(cur.phone);
        if (via === "zalo" && z) window.open("https://zalo.me/" + z, "_blank", "noopener");
        toast(via === "zalo" ? "Đã tải ảnh và sao chép link · gửi cho khách trong Zalo" : "Đã tải ảnh và sao chép link · gửi cho khách qua Messenger");
      }
    }
    run(() => api.send(cur.code, via));
  };

  const opts: Opt[] = (products ?? [])
    .filter((p) => !p.link)
    .flatMap((p) => (p.variants.length ? p.variants.map((v, i) => ({ key: p.id + "::" + i, productId: p.id, variant: i, name: p.name + " – " + v.name, img: v.img || p.img })) : [{ key: p.id, productId: p.id, name: p.name, img: p.img }]));
  const shown = (pq ? opts.filter((o) => norm(o.name).includes(norm(pq))) : opts).slice(0, 8);

  const st = cur?.invoiceStatus ?? "new";
  const last = cur?.invoice.sends.at(-1);
  const banner = st === "new" ? "Hoá đơn đã tạo sẵn khi bạn xác nhận đơn · chưa gửi khách" : st === "changed" ? `Hoá đơn đã cập nhật sau lần gửi lúc ${last ? at(last.at) : ""} · nhớ gửi lại cho khách` : `Đã gửi qua ${last ? VIA[last.via] : ""} lúc ${last ? at(last.at) : ""}`;

  return (
    <Shell variant="flow">
      <main className="main-pad" style={sx(MAIN.flow)}>
        <MobileHead title="Hoá đơn" sub={list0.filter((o) => o.invoiceStatus !== "sent").length + " hoá đơn cần gửi"} />
        <div style={sx("display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between")}>
          <div className="only-desktop" style={sx("display: flex; flex-direction: column; gap: 2px")}>
            <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>Hoá đơn</h1>
            <span style={sx("color: #7d6862; font-size: 14px")}>Tự tạo khi bạn xác nhận đơn · tự cập nhật khi khách thêm hoặc bớt sản phẩm</span>
          </div>
          <Segmented label="Lọc hoá đơn" items={Fs.map(([id, l, f]) => [id, l + " · " + list0.filter(f).length] as [F, string])} value={filter} onPick={setFilter} />
        </div>

        <div style={sx("display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start")}>
          <section aria-label="Danh sách hoá đơn" style={sx("flex: 1 1 300px; max-width: 360px; min-width: 0; background: rgba(255, 250, 247, 0.85); border: 1px solid #efd9d3; border-radius: 22px; padding: 8px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10); display: flex; flex-direction: column; gap: 4px")}>
            {list.map((o) => {
              const s = o.invoiceStatus ?? "new";
              return (
                <button
                  key={o.code}
                  className={o.code === sel ? undefined : "row-btn"}
                  onClick={() => {
                    setSel(o.code);
                    setMenu(false);
                    setAdding(false);
                  }}
                  style={sx(
                    "box-sizing: border-box; display: flex; align-items: center; gap: 12px; width: 100%; padding: 11px 12px; border-radius: 16px; font: inherit; color: inherit; " +
                      (o.code === sel ? "background: #fbe7ec; border: 1.5px solid #b3566f" : "background: transparent; border: 1.5px solid transparent"),
                  )}
                >
                  <Avatar src={o.avatar} name={o.name} size={40} ring={false} />
                  <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; text-align: left")}>
                    <b style={sx("font-size: 14.5px")}>{o.name || "Khách"}</b>
                    <span style={sx("font-size: 12.5px; color: #a3546a; font-weight: 700; letter-spacing: 0.3px")}>HĐ-{o.code}</span>
                  </span>
                  <span style={sx("display: flex; flex-direction: column; align-items: flex-end; gap: 4px")}>
                    <b style={sx("font-size: 14.5px")}>{fmt(o.total)}</b>
                    <span style={sx("box-sizing: border-box; font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 2px 9px; " + CH[s][1])}>{CH[s][0]}</span>
                  </span>
                </button>
              );
            })}
            {!list.length ? (
              <p style={sx("margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>{all ? (list0.length ? "Không có hoá đơn nào trong mục này." : "Chưa có hoá đơn. Xác nhận đơn ở trang Đơn hàng để tạo hoá đơn.") : "Đang tải hoá đơn…"}</p>
            ) : null}
          </section>

          {cur ? (
            <section aria-label="Hoá đơn" className="detail-sheet inv-sheet" style={sx("flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 14px")}>
              <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 10px")}>
                <span style={sx("box-sizing: border-box; font-size: 13.5px; font-weight: 600; border-radius: 12px; padding: 9px 14px; " + CH[st][1])}>{banner}</span>
                <span style={{ flex: 1 }}></span>
                <span className="only-mobile">
                  <CloseX label="Đóng hoá đơn" onClick={() => setSel(null)} />
                </span>
                <div ref={menuRef} style={sx("position: relative")}>
                  <button
                    onClick={() => setMenu(!menu)}
                    aria-expanded={menu}
                    style={sx("display: inline-flex; align-items: center; gap: 8px; border: 0; background: #b3566f; color: #ffffff; border-radius: 999px; padding: 12px 20px; font-weight: 700; font-size: 15px; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.22)")}
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 3L10 14"></path>
                      <path d="M21 3l-7 18-4-7-7-4z"></path>
                    </svg>
                    {st === "new" ? "Gửi hoá đơn" : st === "changed" ? "Gửi lại hoá đơn" : "Gửi lại"}
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                      <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </button>
                  {menu ? (
                    <div style={sx("position: absolute; right: 0; top: calc(100% + 8px); z-index: 5; width: 250px; background: #ffffff; border: 1px solid #efd9d3; border-radius: 16px; box-shadow: 0 14px 30px rgba(120, 60, 75, 0.18); padding: 6px; display: flex; flex-direction: column")}>
                      {SEND_OPTS.map(([via, badge, label, hint]) => (
                        <button
                          key={via}
                          className="menu-opt"
                          onClick={() => send(via)}
                          style={sx("display: flex; align-items: center; gap: 10px; border: 0; background: transparent; border-radius: 10px; padding: 11px 12px; text-align: left; font-size: 14px; font-weight: 600; color: #3d3530")}
                        >
                          <span style={sx("width: 30px; height: 30px; flex: 0 0 30px; border-radius: 8px; background: #f6e1dc; color: #a3546a; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700")}>{badge}</span>
                          <span style={sx("flex: 1; display: flex; flex-direction: column")}>
                            <span>{label}</span>
                            <span style={sx("font-size: 12px; font-weight: 400; color: #7d6862")}>{hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <Paper
                o={cur}
                shop={shop}
                showQr
                edit={{
                  busy,
                  dec: (k) => run(() => (cur.items[k].qty <= 1 ? api.removeItem(cur.code, k) : api.updateItem(cur.code, k, { qty: cur.items[k].qty - 1 }))),
                  inc: (k) => run(() => api.updateItem(cur.code, k, { qty: Math.min(99, cur.items[k].qty + 1) })),
                  remove: (k) => run(() => api.removeItem(cur.code, k)),
                }}
                addSlot={
                  <div style={sx("display: flex; flex-wrap: wrap; gap: 8px; padding-top: 12px; align-items: center")}>
                    <button
                      onClick={() => setAdding(!adding)}
                      aria-expanded={adding}
                      style={sx("display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed #b3566f; background: #fdf3f5; color: #a3546a; border-radius: 12px; padding: 8px 14px; font-weight: 700; font-size: 13.5px")}
                    >
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14"></path>
                      </svg>
                      Khách thêm sản phẩm
                    </button>
                    {adding ? (
                      <>
                        <Search label="Tìm sản phẩm để thêm" placeholder="Tìm sản phẩm…" value={pq} onChange={setPq} flex="0 1 220px" minWidth="160px" />
                        <div style={sx("display: flex; flex-wrap: wrap; gap: 8px; flex-basis: 100%")}>
                          {shown.map((p) => (
                            <button
                              key={p.key}
                              disabled={busy}
                              onClick={() => {
                                setAdding(false);
                                setPq("");
                                run(() => api.addItem(cur.code, { productId: p.productId, variant: p.variant, qty: 1 }));
                              }}
                              style={sx("display: inline-flex; align-items: center; gap: 8px; border: 1px solid #efd9d3; background: #ffffff; border-radius: 12px; padding: 5px 10px 5px 5px; font-size: 13px; font-weight: 600; color: #3d3530")}
                            >
                              <img src={p.img} alt="" style={sx("width: 28px; height: 28px; border-radius: 8px; object-fit: contain")} />
                              {p.name}
                            </button>
                          ))}
                          {products && !shown.length ? <span style={sx("font-size: 13px; color: #7d6862")}>Không tìm thấy sản phẩm.</span> : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                }
              />

              {cur.invoice.log.length ? (
                <div style={sx("display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #6f5a55; padding: 0 6px")}>
                  <b style={sx("color: #3d3530; font-size: 13.5px")}>Lịch sử thay đổi</b>
                  {cur.invoice.log.map((l, i) => (
                    <span key={i}>• {l.msg}</span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </Shell>
  );
}
