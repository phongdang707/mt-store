import { useEffect, useMemo, useState } from "react";
import { openChat, saveImageToGallery } from "zmp-sdk/apis";
import { invoiceImage } from "@/services/invoice-image";
import { ApiError, api, inZalo } from "@/services/api";
import { useStore } from "@/state/store";
import type { InvoiceStatus, SupportDesk, SupportInvoice } from "@/types";
import { blobToBase64 } from "@/utils/image";
import { fmt, norm } from "@/utils/format";
import { toast } from "@/utils/toast";

const STATUS: Record<InvoiceStatus, string> = {
  new: "Chưa gửi",
  changed: "Cần gửi lại",
  sent: "Đã gửi",
};

function Bg() {
  const { setOpen } = useStore();
  return <div className="sheet-bg" onClick={() => setOpen(null)}></div>;
}

function download(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function openZalo(id: string) {
  if (!inZalo) {
    toast("Mở trong Zalo để nhắn khách");
    return false;
  }
  if (!id) {
    toast("Chưa có Zalo id của khách");
    return false;
  }
  try {
    await openChat({ type: "user", id });
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
  const [preview, setPreview] = useState("");
  const [png, setPng] = useState<Blob | null>(null);

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
  const billKey = cur
    ? [cur.code, cur.name, cur.phone, cur.addr, cur.subtotal, cur.total, cur.shippingFee, cur.shipBase, desk?.store, desk?.tagline, desk?.logo, desk?.qr, desk?.bank.bin, desk?.bank.acc, desk?.bank.bank, desk?.bank.name, cur.items.map((i) => [i.name, i.variantName, i.qty, i.price, i.img].join(":")).join("|")].join("\n")
    : "";

  useEffect(() => {
    if (!cur || !desk) {
      setPreview("");
      setPng(null);
      return;
    }
    let stop = false;
    let url = "";
    setPreview("");
    setPng(null);
    invoiceImage(cur, desk)
      .then((file) => {
        if (stop) return;
        if (!file) {
          toast("Chưa tạo được ảnh hoá đơn");
          return;
        }
        url = URL.createObjectURL(file);
        setPng(file);
        setPreview(url);
      })
      .catch(() => {
        if (!stop) toast("Chưa tạo được ảnh hoá đơn");
      });
    return () => {
      stop = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [billKey]);

  const markSent = async (o: SupportInvoice) => {
    const r = await api.supportSend(o.code);
    setDesk((d) =>
      d ? { ...d, invoices: d.invoices.map((i) => (i.code === o.code ? { ...i, invoiceStatus: r.invoiceStatus } : i)) } : d,
    );
  };

  const saveBill = async (o: SupportInvoice) => {
    if (busy || !desk) return;
    setBusy(true);
    try {
      const file = png ?? (await invoiceImage(o, desk));
      if (!file) {
        toast("Chưa tạo được ảnh hoá đơn");
        return;
      }
      const name = "hoa-don-" + o.code + ".png";
      if (!inZalo) {
        download(file, name);
        toast("Đã tải ảnh hoá đơn");
      } else {
        await saveImageToGallery({ imageBase64Data: await blobToBase64(file) });
        toast("Đã lưu ảnh hoá đơn vào máy");
      }
      await markSent(o);
    } catch (e) {
      toast((e as Error).message || "Chưa lưu được ảnh hoá đơn");
    } finally {
      setBusy(false);
    }
  };

  const talk = async (o: SupportInvoice) => {
    if (busy) return;
    if (!o.zaloUserId) return toast("Chưa có Zalo id của khách");
    setBusy(true);
    await openZalo(o.zaloUserId);
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
              {preview ? <img className="cs-bill" src={preview} alt={"Hoá đơn " + cur.code} /> : <div className="empty">Đang tạo hoá đơn…</div>}
              {!cur.zaloUserId ? <p className="lock">Chưa có Zalo id của khách này.</p> : null}
            </div>
            <div className="sh-f cs-acts">
              <button className="btn" disabled={busy || !png} onClick={() => saveBill(cur)}>
                Lưu hình
              </button>
              <button className="btn ghost" disabled={busy || !cur.zaloUserId} onClick={() => talk(cur)}>
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
