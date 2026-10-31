export function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((r) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = src;
  });
}
