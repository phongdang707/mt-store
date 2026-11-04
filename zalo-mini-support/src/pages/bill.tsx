import { useEffect, useState } from "react";
import { Page, useParams, useSnackbar } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { BackBar } from "@/components/shell";
import { orderImage } from "@/invoice/image";
import { saveInvoice } from "@/invoice/save";
import { markSent } from "@/services/api";
import { invoiceMessage, openCareChat } from "@/services/chat";
import { money } from "@/services/format";
import { useDesk } from "@/state";
import type { Bank, Desk, Invoice, InvoiceStatus } from "@/types";

const STATUS: Record<InvoiceStatus, string> = {
  new: "Chưa gửi",
  changed: "Cần gửi lại",
  sent: "Đã gửi",
};

const EMPTY_BANK: Bank = { bank: "", bin: "", acc: "", name: "" };

function shopOf(desk: Desk) {
  return {
    store: desk.store || "MT store",
    logo: desk.logo,
    qr: desk.qr || "",
    bank: desk.bank ?? EMPTY_BANK,
  };
}

function billKey(row: Invoice, desk: Desk) {
  return [
    row.code,
    row.name,
    row.phone,
    row.addr,
    row.subtotal,
    row.total,
    row.shippingFee,
    row.shipBase,
    row.createdAt,
    desk.store,
    desk.logo,
    desk.qr,
    desk.bank?.bin,
    desk.bank?.acc,
    desk.bank?.bank,
    desk.bank?.name,
    row.items.map((item) => [item.name, item.variantName, item.qty, item.price, item.img].join(":")).join("|"),
  ].join("\n");
}

export default function BillPage() {
  const { code = "" } = useParams();
  const { desk, noteSent } = useDesk();
  const { openSnackbar } = useSnackbar();
  const [busy, setBusy] = useState<"save" | "talk" | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState("");
  const [png, setPng] = useState<Blob | null>(null);
  const row = desk?.invoices.find((item) => item.code === code);
  const key = row && desk ? billKey(row, desk) : "";
  const message = invoiceMessage(desk?.store || "", row?.name || "", row?.code || "", money(row?.total || 0));

  useEffect(() => {
    if (!row || !desk) {
      setPreview("");
      setPng(null);
      setDrawing(false);
      return;
    }
    let stop = false;
    let url = "";
    setDrawing(true);
    setPreview("");
    setPng(null);
    orderImage(row, shopOf(desk))
      .then((file) => {
        if (stop) return;
        if (!file) {
          openSnackbar({ text: "Chưa tạo được ảnh hoá đơn", type: "error" });
          return;
        }
        url = URL.createObjectURL(file);
        setPng(file);
        setPreview(url);
      })
      .catch(() => {
        if (!stop) openSnackbar({ text: "Chưa tạo được ảnh hoá đơn", type: "error" });
      })
      .finally(() => {
        if (!stop) setDrawing(false);
      });
    return () => {
      stop = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);

  const mark = async () => {
    if (!row || row.invoiceStatus === "sent") return;
    await markSent(row.code);
    noteSent(row.code);
  };

  const save = async () => {
    if (!row || !desk || busy) return;
    setBusy("save");
    try {
      const file = png ?? (await orderImage(row, shopOf(desk)));
      if (!file) {
        openSnackbar({ text: "Chưa tạo được ảnh hoá đơn", type: "error" });
        return;
      }
      const place = await saveInvoice(file, `hoa-don-${row.code}.png`);
      const saved = place === "gallery" ? "Đã lưu ảnh vào thư viện" : "Đã tải ảnh hoá đơn về máy";
      try {
        await mark();
      } catch (error) {
        const why = error instanceof Error ? error.message : "Chưa đánh dấu đã gửi";
        openSnackbar({ text: `${saved}. ${why}`, type: "error" });
        return;
      }
      openSnackbar({ text: saved, type: "success" });
    } catch (error) {
      openSnackbar({ text: error instanceof Error ? error.message : "Chưa lưu được ảnh hoá đơn", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const talk = async () => {
    if (!row || busy) return;
    if (!row.zaloUserId) {
      openSnackbar({ text: "Chưa có Zalo user id của khách", type: "error" });
      return;
    }
    setBusy("talk");
    try {
      await openCareChat(row.zaloUserId, message);
      await mark();
      openSnackbar({ text: "Đã mở cuộc trò chuyện. Bạn gửi ảnh hoá đơn trong Zalo.", type: "success" });
    } catch (error) {
      openSnackbar({ text: error instanceof Error ? error.message : "Chưa mở được cuộc trò chuyện", type: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page>
      <BackBar title={row ? row.name || "Khách" : code || "Hoá đơn"} sub={row ? `${row.code} · ${STATUS[row.invoiceStatus]}` : undefined} />
      <div className="screen bare">
        <Gate>
          {!row ? (
            <Hold title="Không thấy đơn này trong danh sách đã tải." />
          ) : (
            <>
              {preview ? <img className="bill-shot" src={preview} alt={"Hoá đơn " + row.code} /> : null}
              {drawing && !preview ? <p className="hint">Đang tạo hoá đơn…</p> : null}
              {!drawing && !preview ? <Hold title="Chưa tạo được ảnh hoá đơn." /> : null}

              <div className="foot">
                {!row.zaloUserId ? <p className="hint">Khách chưa đăng nhập Zalo trên trang bán hàng.</p> : null}
                <button type="button" className="btn" disabled={!!busy || drawing} onClick={() => void save()}>
                  {busy === "save" ? "Đang lưu…" : "Lưu hoá đơn"}
                </button>
                <button type="button" className="btn ghost" disabled={!row.zaloUserId || !!busy} onClick={() => void talk()}>
                  {busy === "talk" ? "Đang mở…" : "Nhắn Zalo"}
                </button>
              </div>
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
