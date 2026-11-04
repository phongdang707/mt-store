import { storage } from "@/utils/storage";

export type Theme = "light" | "dark";

/** Khóa localStorage. Script trong layout đọc cùng khóa này, dạng JSON như `storage`. */
export const THEME_KEY = "mt_theme";

export const themeBootScript = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(THEME_KEY)});var t=raw?JSON.parse(raw):null;if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function savedTheme(): Theme | null {
  const v = storage.get<unknown>(THEME_KEY, null);
  return v === "light" || v === "dark" ? v : null;
}

export function systemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Theme đang hiện: lựa chọn đã lưu nếu có, không thì theo máy. */
export function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return savedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  storage.set(THEME_KEY, theme);
}
