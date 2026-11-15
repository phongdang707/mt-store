"use client";

import { Logo } from "@/components/catalog";
import { ThemeToggle } from "@/components/theme-toggle";

/** Trang chào trước khi có phiên Google. Nền và nút lấy từ theme shop. */
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
        <section className="gate" aria-label="Đăng nhập bằng Google">
          <Logo width="min(220px, 52vw)" />
          <h1>Chào bạn yêu</h1>
          {waiting ? (
            <p className="gate-wait" role="status">
              <span className="gate-spin" aria-hidden="true" />
              {line || "Đang mở cửa shop cho bạn…"}
            </p>
          ) : (
            <>
              <p>Đăng nhập Google một cái thôi, mình mở shop cho bạn xem đồ xinh và gửi đơn nha.</p>
              <button className="btn" type="button" onClick={onLogin}>
                Đăng nhập bằng Google
              </button>
              <small>Không cần mật khẩu đâu. Google chỉ để shop nhận ra bạn thôi.</small>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
