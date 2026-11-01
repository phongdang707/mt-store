import { useEffect, useMemo, useState } from "react";
import { openChat } from "zmp-sdk/apis";
import { billMessage } from "@/services/bill";
import { ApiError, api, inZalo } from "@/services/api";
import { useStore } from "@/state/store";
import type { InvoiceStatus, SupportDesk, SupportInvoice } from "@/types";
import { fmt, norm } from "@/utils/format";
import { toast } from "@/utils/toast";

const STATUS: Record<InvoiceStatus, string> = {
  new: "Chưa gửi",
  changed: "Cần gửi lại",
  sent: "Đã gửi",
};

const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);

function Bg() {
  const { setOpen } = useStore();
  return <div className="sheet-bg" onClick={() => setOpen(null)}></div>;
}

async function openZalo(id: string, message?: string) {
  if (!inZalo) {
    toast("Mở trong Zalo để nhắn khách");
    return false;
  }
  if (!id) {
    toast("Chưa có Zalo id của khách");
    return false;
  }
  try {
    await openChat(message ? { type: "user", id, message } : { type: "user", id });
    return true;
  } catch (e) {
    toast((e as Error).message || "Chưa mở được cuộc chat Zalo");
    return false;
  }
}

export function SupportSheet() {
  const { setOpen } = useStore();
  const [desk, setDesk] = useState<SupportDesk | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todo" | "sent">("todo");
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setErr("");
    api
      .supportInvoices()
      .then(setDesk)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Chưa tải được hoá đơn"));
  };

  useEffect(() => {
    load();
  }, []);

  const list = useMemo(() => {
    const rows = desk?.invoices ?? [];
    const n = norm(q);
    return rows.filter((o) => {
      const sent = o.invoiceStatus === "sent";
      if (filter === "sent" ? !sent : sent) return false;
      if (!n) return true;
      return norm([o.code, o.name, o.phone].join(" ")).includes(n);
    });
  }, [desk, q, filter]);

  const cur = desk?.invoices.find((o) => o.code === code) ?? null;
  const todo = desk?.invoices.filter((o) => o.invoiceStatus !== "sent").length ?? 0;
  const sent = desk?.invoices.filter((o) => o.invoiceStatus === "sent").length ?? 0;

  const talk = async (o: SupportInvoice, withBill: boolean) => {
    if (busy) return;
    if (!o.zaloUserId) return toast("Chưa có Zalo id của khách");
    setBusy(true);
    const opened = await openZalo(o.zaloUserId, withBill && desk ? billMessage(o, desk) : undefined);
    if (opened && withBill) {
      try {
        const r = await api.supportSend(o.code);
        setDesk((d) =>
          d
            ? { ...d, invoices: d.invoices.map((i) => (i.code === o.code ? { ...i, invoiceStatus: r.invoiceStatus } : i)) }
            : d,
        );
      } catch (e) {
        toast((e as Error).message);
      }
    }
    setBusy(false);
  };

  return (
    <>
      <Bg />
      <aside className="sheet" role="dialog" aria-label="Chăm sóc khách hàng">
        <div className="sh-h">
          <h2>{cur ? cur.code : "CHĂM SÓC"}</h2>
          <button className="x" onClick={() => setOpen(null)} aria-label="Đóng">
            ✕
          </button>
        </div>
        {cur && desk ? (
          <>
            <div className="sh-b">
              <button className="cs-back" onClick={() => setCode(null)}>
                ‹ Danh sách
              </button>
              <p className="cs-who">
                <b>{cur.name || "Khách"}</b>
                {cur.phone ? <span>{cur.phone}</span> : null}
                <span className={`oc-st ${cur.invoiceStatus === "sent" ? "ok" : ""}`}>{STATUS[cur.invoiceStatus]}</span>
              </p>
              <ul className="cs-lines">
                {cur.items.map((it, i) => (
                  <li key={i}>
                    <span>
                      {itemName(it)} <em>× {it.qty}</em>
                    </span>
                    <b>{it.price ? fmt(it.price * it.qty) : "chờ báo giá"}</b>
                  </li>
                ))}
              </ul>
              <div className="cs-sum">
                <span>Tạm tính</span>
                <b>{fmt(cur.subtotal)}</b>
                {cur.shippingFee || (!!cur.shipBase && cur.shippingFee === 0) ? (
                  <>
                    <span>Phí giao</span>
                    <b>{cur.shippingFee ? fmt(cur.shippingFee) : "Miễn phí"}</b>
                  </>
                ) : null}
                <span>Tổng cộng</span>
                <b>{fmt(cur.total)}</b>
              </div>
              <div className="cs-bank">
                <b>Chuyển khoản</b>
                <span>{[desk.bank.bank, desk.bank.acc].filter(Boolean).join(" · ") || "Shop chưa nhập ngân hàng"}</span>
                {desk.bank.name ? <span>{desk.bank.name}</span> : null}
                <span>Nội dung: {cur.code} {cur.phone.replace(/\D/g, "")}</span>
              </div>
              {!cur.zaloUserId ? <p className="lock">Chưa có Zalo id của khách này.</p> : null}
            </div>
            <div className="sh-f cs-acts">
              <button className="btn" disabled={busy || !cur.zaloUserId} onClick={() => talk(cur, true)}>
                Gửi hoá đơn
              </button>
              <button className="btn ghost" disabled={busy || !cur.zaloUserId} onClick={() => talk(cur, false)}>
                Nhắn tin
              </button>
            </div>
          </>
        ) : (
          <div className="sh-b">
            <div className="cs-filters" role="group" aria-label="Lọc hoá đơn">
              <button className={filter === "todo" ? "on" : ""} onClick={() => setFilter("todo")}>
                Cần gửi{desk ? ` · ${todo}` : ""}
              </button>
              <button className={filter === "sent" ? "on" : ""} onClick={() => setFilter("sent")}>
                Đã gửi{desk ? ` · ${sent}` : ""}
              </button>
            </div>
            <input className="cs-q" type="search" placeholder="Tìm mã đơn, tên, số điện thoại…" aria-label="Tìm hoá đơn" value={q} onChange={(e) => setQ(e.target.value)} />
            {err ? (
              <div className="empty">
                {err}
                <br />
                <button className="btn ghost" style={{ width: "auto", padding: "10px 22px" }} onClick={load}>
                  Thử lại
                </button>
              </div>
            ) : !desk ? (
              <div className="empty">Đang tải hoá đơn…</div>
            ) : list.length ? (
              list.map((o) => (
                <button key={o.code} className="cs-row" onClick={() => setCode(o.code)}>
                  <span>
                    <b>{o.name || "Khách"}</b>
                    <small>
                      {o.code}
                      {o.phone ? " · " + o.phone : ""}
                    </small>
                  </span>
                  <span>
                    <strong>{fmt(o.total)}</strong>
                    <em className={o.invoiceStatus === "sent" ? "ok" : ""}>{STATUS[o.invoiceStatus]}</em>
                  </span>
                </button>
              ))
            ) : (
              <div className="empty">{q ? "Không có hoá đơn khớp." : filter === "todo" ? "Không có hoá đơn cần gửi." : "Chưa gửi hoá đơn nào."}</div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
