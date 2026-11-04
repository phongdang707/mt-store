import { useEffect, useState } from "react";
import { Avatar, Button, Header, Icon, Page, Text, useParams, useSnackbar } from "zmp-ui";
import { Gate } from "@/components/gate";
import { orderImage } from "@/invoice/image";
import { saveInvoice } from "@/invoice/save";
import { invoiceMessage, openCareChat } from "@/services/chat";
import { markSent } from "@/services/api";
import { money } from "@/services/format";
import { useDesk } from "@/state";

type Busy = "" | "save" | "send";

export default function BillPage() {
  const { code = "" } = useParams();
  const { desk, noteSent } = useDesk();
  const { openSnackbar } = useSnackbar();
  const [busy, setBusy] = useState<Busy>("");
  const [png, setPng] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const [drawError, setDrawError] = useState(false);
  const row = desk?.invoices.find((item) => item.code === code);
  const message = row ? invoiceMessage(desk?.store || "", row.name || "", row.code, money(row.total)) : "";
  const fileName = "hoa-don-" + code + ".png";

  // Vẽ ảnh hoá đơn giống admin mỗi khi đơn hoặc thông tin shop đổi.
  useEffect(() => {
    if (!row || !desk) return;
    let stop = false;
    let url = "";
    setDrawError(false);
    orderImage(row, {
      store: desk.store || "MT store",
      bank: desk.bank || { bank: "", bin: "", acc: "", name: "" },
      qr: desk.qr || "",
      logo: desk.logo || "",
    })
      .catch((error: unknown) => {
        console.error("orderImage", error);
        return null;
      })
      .then((b) => {
        if (stop) return;
        setPng(b);
        if (!b) {
          setDrawError(true);
          setPreview("");
          return;
        }
        url = URL.createObjectURL(b);
        setPreview(url);
      });
    return () => {
      stop = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [row, desk]);

  const fail = (error: unknown, fallback: string) => openSnackbar({ text: error instanceof Error ? error.message : fallback, type: "error" });

  const save = async () => {
    if (!png || busy) return;
    setBusy("save");
    try {
      await saveInvoice(png, fileName);
      openSnackbar({ text: "Đã lưu ảnh hoá đơn vào thư viện ảnh.", type: "success" });
    } catch (error) {
      fail(error, "Chưa lưu được ảnh hoá đơn");
    } finally {
      setBusy("");
    }
  };

  /** Lưu ảnh vào máy rồi mở chat với khách. Zalo chỉ điền sẵn chữ, ảnh thì nhân viên đính từ thư viện. */
  const send = async () => {
    if (!row || !png || busy) return;
    if (!row.zaloUserId) {
      openSnackbar({ text: "Chưa có Zalo user id của khách", type: "error" });
      return;
    }
    setBusy("send");
    try {
      await saveInvoice(png, fileName);
      await openCareChat(row.zaloUserId, message);
      if (row.invoiceStatus !== "sent") {
        await markSent(row.code);
        noteSent(row.code);
      }
      openSnackbar({ text: "Ảnh hoá đơn đã lưu trong máy. Trong chat, bấm nút ảnh và chọn ảnh hoá đơn để gửi khách.", type: "success", duration: 6000 });
    } catch (error) {
      fail(error, "Chưa mở được cuộc trò chuyện");
    } finally {
      setBusy("");
    }
  };

  return (
    <Page>
      <Header title={code || "Hoá đơn"} />
      <div className="screen">
        <Gate>
          {!row ? (
            <Text>Không thấy đơn này trong danh sách đã tải.</Text>
          ) : (
            <>
              <div className="who">
                <Avatar src={row.avatar || undefined} size={56} />
                <div>
                  <Text bold>{row.name || "Khách"}</Text>
                  <Text size="small" className="muted">
                    {row.code} · {money(row.total)}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </Text>
                </div>
              </div>

              {preview ? (
                <img className="bill-img" src={preview} alt={"Hoá đơn " + row.code} />
              ) : (
                <div className="bill-img bill-wait">
                  <Text size="small" className="muted">
                    {drawError ? "Chưa tạo được ảnh hoá đơn." : "Đang tạo ảnh hoá đơn…"}
                  </Text>
                </div>
              )}

              <Button
                fullWidth
                prefixIcon={<Icon icon="zi-chat" />}
                disabled={!row.zaloUserId || !png}
                loading={busy === "send"}
                onClick={() => void send()}
              >
                Gửi hoá đơn qua Zalo
              </Button>
              <Button fullWidth variant="secondary" prefixIcon={<Icon icon="zi-download" />} disabled={!png} loading={busy === "save"} onClick={() => void save()}>
                Tải hoá đơn về máy
              </Button>

              <Text size="small" className="muted">
                Bấm gửi: ảnh hoá đơn được lưu vào thư viện ảnh, rồi Zalo mở chat với khách và điền sẵn lời nhắn. Bạn gửi lời nhắn, sau đó bấm nút ảnh và chọn ảnh hoá đơn vừa lưu.
              </Text>
              <Text size="small">{message}</Text>
              {!row.zaloUserId ? <Text>Đơn này chưa có Zalo user id. Khách cần đăng nhập Zalo trên trang bán hàng. Bạn vẫn tải được ảnh hoá đơn.</Text> : null}
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
