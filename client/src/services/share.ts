import { openPhone, openWebview, saveImageToGallery } from "zmp-sdk/apis";
import { inZalo } from "./api";
import { blobToBase64 } from "@/utils/image";
import { toast } from "@/utils/toast";

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
