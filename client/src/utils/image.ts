/** Thu nhỏ ảnh khách gửi (cạnh dài ≤1400px, JPEG 85%) trước khi tải lên. */
export function shrink(file: File): Promise<Blob> {
  return new Promise((res) => {
    const u = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const M = 1400,
        sc = Math.min(1, M / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = Math.round(im.width * sc);
      c.height = Math.round(im.height * sc);
      const x = c.getContext("2d")!;
      x.fillStyle = "#fff";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => res(b || file), "image/jpeg", 0.85);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      res(file);
    };
    im.src = u;
  });
}

export function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((r) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = src;
  });
}

export function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}
