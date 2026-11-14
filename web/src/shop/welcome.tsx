"use client";

import { Logo } from "@/components/catalog";
import { ThemeToggle } from "@/components/theme-toggle";

/** Trang chào trước khi có phiên Facebook. Nền và nút lấy từ theme shop. */
export function Welcome({ waiting, onLogin, line }: { waiting?: boolean; onLogin?: () => void; line?: string }) {
  return (
    <div className="shop">
      <header className="bar">
        <div className="bar-in">
          <div className="bar-acts">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="wrap gate-wrap">
        <section className="gate" aria-label="Đăng nhập bằng Facebook">
          <Logo width="min(220px, 52vw)" />
          <h1>Chào bạn yêu</h1>
          {waiting ? (
            <p>{line || "Đang mở cửa shop cho bạn…"}</p>
          ) : (
            <>
              <p>Đăng nhập Facebook một cái thôi, mình mở shop cho bạn xem đồ xinh và gửi đơn nha.</p>
              <button className="btn" type="button" onClick={onLogin}>
                Đăng nhập bằng Facebook
              </button>
              <small>Không cần mật khẩu đâu. Facebook chỉ để shop nhận ra bạn thôi.</small>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
