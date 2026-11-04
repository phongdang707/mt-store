"use client";

import { useEffect, useState } from "react";
import { applyTheme, effectiveTheme, savedTheme, type Theme } from "@/utils/theme";

const Sun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </svg>
);

const Moon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
  </svg>
);

/** Nút đổi sáng/tối. Icon chỉ hiện sau khi đọc theme trên máy, để không lệch hydration. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = savedTheme();
    if (saved) applyTheme(saved);
    const sync = () => setTheme(effectiveTheme());
    sync();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const label = theme === "dark" ? "Chuyển sang giao diện sáng" : theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển giao diện";

  return (
    <button
      type="button"
      className="themebtn"
      aria-label={label}
      onClick={() => {
        const next: Theme = effectiveTheme() === "dark" ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
    >
      {theme === "dark" ? <Sun /> : theme === "light" ? <Moon /> : null}
    </button>
  );
}
