import { saveImageToGallery } from "zmp-sdk";
import { sdkReason } from "@/services/sdk-error";

function dataURL(b: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result || ""));
    r.onerror = () => fail(new Error("Không đọc được ảnh hoá đơn"));
    r.readAsDataURL(b);
  });
}

function download(b: Blob, name: string) {
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

export type SavePlace = "gallery" | "download";

/**
 * Lưu ảnh hoá đơn vào thư viện ảnh của điện thoại (trong Zalo).
 * Ngoài Zalo (localhost, trình duyệt) thì tải file PNG về máy.
 * Trả về nơi ảnh đã được lưu để lời nhắn không nói nhầm.
 */
export async function saveInvoice(png: Blob, name: string): Promise<SavePlace> {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  try {
    await saveImageToGallery({ imageBase64Data: await dataURL(png) });
    return "gallery";
  } catch (error) {
    console.error("saveImageToGallery", error);
    // SDK reject không kèm lỗi khi trang không chạy trong Zalo.
    if (error == null || local) {
      download(png, name);
      return "download";
    }
    const why = sdkReason(error);
    throw new Error(why ? `Chưa lưu được ảnh: ${why}` : "Chưa lưu được ảnh hoá đơn vào máy.");
  }
}
