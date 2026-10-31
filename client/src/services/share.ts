import { openChat, openPhone, openWebview, saveImageToGallery } from "zmp-sdk/apis";
import { inZalo } from "./api";
import { blobToBase64 } from "@/utils/image";
import { toast } from "@/utils/toast";

/** OA nhận đơn (nếu shop có Official Account). */
const OA_ID = String(import.meta.env.VITE_ZALO_OA_ID || "").trim();

/** Trong Zalo, link `target=_blank` và `tel:` mở bằng SDK; ngoài Zalo để trình duyệt xử lý. */
export function installLinkHandler() {
  if (!inZalo) return;
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        e.preventDefault();
        openPhone({ phoneNumber: href.slice(4) }).catch(() => {});
      } else if (/^https?:\/\//.test(href) && a.target === "_blank") {
        e.preventDefault();
        openWebview({ url: href }).catch(() => window.open(href, "_blank"));
      }
    },
    true,
  );
}

export async function saveImage(file: Blob) {
  if (inZalo) {
    await saveImageToGallery({ imageBase64Data: await blobToBase64(file) });
    toast("Đã lưu ảnh vào máy");
    return true;
  }
  const f = file instanceof File ? file : new File([file], "anh.png", { type: file.type });
  try {
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f] });
      return true;
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return true;
  }
  return false;
}

/**
 * Gửi đơn/hoá đơn cho shop: chia sẻ ảnh + nội dung nếu máy hỗ trợ,
 * không thì sao chép nội dung rồi mở chat Zalo của shop.
 */
export async function sendToShop(text: string, file: File | null, zalo: string) {
  if (inZalo) {
    if (file) await saveImageToGallery({ imageBase64Data: await blobToBase64(file) }).catch(() => {});
    if (OA_ID) {
      await openChat({ type: "oa", id: OA_ID, message: text }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    if (zalo) await openWebview({ url: "https://zalo.me/" + zalo }).catch(() => {});
    toast(file ? "Đã lưu ảnh đơn và sao chép nội dung, dán vào Zalo gửi shop nhé" : "Đã sao chép đơn, dán vào Zalo gửi shop nhé");
    return;
  }
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: text.split("\n")[0] });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
  if (zalo) {
    window.open("https://zalo.me/" + zalo, "_blank", "noopener");
    toast("Đã sao chép đơn, dán vào Zalo để gửi shop");
  } else toast("Đã sao chép đơn, bạn dán vào Zalo gửi shop nhé");
}
