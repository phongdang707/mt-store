import type { CSSProperties } from "react";

const cache = new Map<string, CSSProperties>();

/** Chuỗi style CSS (chép nguyên từ thiết kế) → object style của React. */
export function sx(css: string): CSSProperties {
  let v = cache.get(css);
  if (!v) {
    const o: Record<string, string> = {};
    for (const decl of css.split(";")) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const k = decl.slice(0, i).trim();
      if (!k) continue;
      o[k.startsWith("--") ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = decl.slice(i + 1).trim();
    }
    cache.set(css, (v = o as CSSProperties));
  }
  return v;
}
