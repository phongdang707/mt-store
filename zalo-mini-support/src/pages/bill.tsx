import { useState } from "react";
import { Avatar, Button, Header, Page, Text, useParams, useSnackbar } from "zmp-ui";
import { Gate } from "@/components/gate";
import { careMessage, openCareChat } from "@/services/chat";
import { markSent } from "@/services/api";
import { useDesk } from "@/state";

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

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
      <Header title={code || "Đơn"} />
      <div className="screen">
        <Gate>
          {!row ? (
            <Text>Không thấy đơn này trong danh sách đã tải.</Text>
          ) : (
            <>
              <Avatar src={row.avatar || undefined} size={56} />
              <Text bold>{row.name || "Khách"}</Text>
              <Text size="small">
                {row.code} · {money(row.total)}
                {row.phone ? ` · ${row.phone}` : ""}
              </Text>
              <Text size="small">{row.items.map((item) => `${item.name}${item.variantName ? " " + item.variantName : ""} ×${item.qty}`).join(", ")}</Text>
              <Text>
                Zalo sẽ mở cuộc trò chuyện với user id của khách và điền sẵn lời nhắn. Bạn đọc lại rồi bấm gửi. Shop không gửi tin tự động.
              </Text>
              <Text size="small">{message}</Text>
              {!row.zaloUserId ? <Text>Đơn này chưa có Zalo user id. Khách cần đăng nhập Zalo trên trang bán hàng.</Text> : null}
              <Button fullWidth disabled={!row.zaloUserId} loading={busy} onClick={() => void talk()}>
                Nhắn Zalo
              </Button>
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
