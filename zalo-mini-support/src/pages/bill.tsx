import { useState } from "react";
import { Page, useParams, useSnackbar } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { BackBar, Face } from "@/components/shell";
import { markSent } from "@/services/api";
import { careMessage, openCareChat } from "@/services/chat";
import { money } from "@/services/format";
import { useDesk } from "@/state";
import type { InvoiceStatus } from "@/types";

const STATUS: Record<InvoiceStatus, string> = {
  new: "Chưa gửi",
  changed: "Cần gửi lại",
  sent: "Đã gửi",
};

export default function BillPage() {
  const { code = "" } = useParams();
  const { desk, noteSent } = useDesk();
  const { openSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const row = desk?.invoices.find((item) => item.code === code);
  const message = careMessage(desk?.store || "", row?.name || "", row?.code);

  const talk = async () => {
    if (!row || busy) return;
    if (!row.zaloUserId) {
      openSnackbar({ text: "Chưa có Zalo user id của khách", type: "error" });
      return;
    }
    setBusy(true);
    try {
      await openCareChat(row.zaloUserId, message);
      if (row.invoiceStatus !== "sent") {
        await markSent(row.code);
        noteSent(row.code);
      }
      openSnackbar({ text: "Đã mở cuộc trò chuyện. Bạn gửi tin trong Zalo.", type: "success" });
    } catch (error) {
      openSnackbar({ text: error instanceof Error ? error.message : "Chưa mở được cuộc trò chuyện", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BackBar title={code || "Đơn"} sub={row ? STATUS[row.invoiceStatus] : undefined} />
      <div className="screen bare">
        <Gate>
          {!row ? (
            <Hold title="Không thấy đơn này trong danh sách đã tải." />
          ) : (
            <>
              <section className="card who">
                <Face src={row.avatar} name={row.name} size={56} />
                <div className="grow">
                  <b className="nm">{row.name || "Khách"}</b>
                  <span className="meta">{row.phone || "Chưa có số điện thoại"}</span>
                </div>
              </section>

              <section className="card">
                {row.items.map((item, idx) => (
                  <p key={idx} className="line">
                    <span>
                      {item.name}
                      {item.variantName ? ` ${item.variantName}` : ""}
                    </span>
                    <b>×{item.qty}</b>
                  </p>
                ))}
                <div className="sums">
                  <div className="sum total">
                    <span>Tổng</span>
                    <b>{money(row.total)}</b>
                  </div>
                </div>
              </section>

              <div className="note">
                <span className="k">Lời nhắn</span>
                <p className="quote">{message}</p>
              </div>

              <div className="foot">
                {!row.zaloUserId ? <p className="hint">Khách chưa đăng nhập Zalo trên trang bán hàng.</p> : null}
                <button type="button" className="btn" disabled={!row.zaloUserId || busy} onClick={() => void talk()}>
                  {busy ? "Đang mở…" : "Nhắn Zalo"}
                </button>
              </div>
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
