import { useState } from "react";
import { useSnackbar } from "zmp-ui";
import { openCareChat } from "@/services/chat";

/** Mở thẳng cuộc chat Zalo 1-1 với khách, lời nhắn điền sẵn. `busy` là user id đang mở. */
export function useTalk() {
  const { openSnackbar } = useSnackbar();
  const [busy, setBusy] = useState("");

  const talk = async (zaloUserId: string, message: string) => {
    if (busy) return false;
    if (!zaloUserId) {
      openSnackbar({ text: "Khách chưa đăng nhập Zalo trên trang bán hàng nên chưa nhắn được.", type: "error" });
      return false;
    }
    setBusy(zaloUserId);
    try {
      await openCareChat(zaloUserId, message);
      return true;
    } catch (error) {
      openSnackbar({ text: error instanceof Error ? error.message : "Chưa mở được cuộc trò chuyện", type: "error" });
      return false;
    } finally {
      setBusy("");
    }
  };

  return { busy, talk };
}
