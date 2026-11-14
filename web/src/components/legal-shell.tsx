"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

/** Khung trang pháp lý công khai. Không cần đăng nhập. */
export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop">
      <header className="bar legal-bar">
        <div className="bar-in">
          <Link href="/" className="legal-home">
            MT store
          </Link>
          <div className="bar-acts">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="wrap legal-wrap">{children}</main>
    </div>
  );
}
