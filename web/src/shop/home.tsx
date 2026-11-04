"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Catalog, Dock, Header } from "@/components/catalog";
import { Overlays } from "@/components/overlays";
import { CartSheet, OrdersSheet, PhotoSheet, PickSheet } from "@/components/sheets";
import { SupportSheet } from "@/components/support-sheet";
import { useStore } from "@/state/store";

export default function HomePage() {
  const { D, loadError, loadCatalog, open, setOpen, blocked, loginAsk, notice, closeLogin, startLogin } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open && !loginAsk) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (loginAsk) closeLogin();
      else setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loginAsk, closeLogin, setOpen]);

  if (blocked) {
    return (
      <div className="shop">
        <main className="wrap">
          <div className="hold">
            <div className="hold-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l2.5 1.5" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h1>Hệ thống đang bảo trì</h1>
            <p>Cửa hàng tạm ngưng để bảo trì. Bạn quay lại sau nhé.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="shop">
      <Header />
      {notice ? <div className="toast">{notice}</div> : null}
      {D ? (
        <Catalog />
      ) : (
        <main className="wrap">
          <div className="empty">
            {loadError ? (
              <>
                {loadError}
                <br />
                <button className="btn ghost" style={{ marginTop: 14, width: "auto", padding: "10px 22px" }} onClick={loadCatalog}>
                  Thử lại
                </button>
              </>
            ) : (
              "Đang tải bảng giá…"
            )}
          </div>
        </main>
      )}
      {mounted &&
        createPortal(
          <>
            {D && !open && !loginAsk && <Dock />}
            {open === "cart" && <CartSheet />}
            {open === "pick" && <PickSheet />}
            {open === "orders" && <OrdersSheet />}
            {open === "support" && <SupportSheet />}
            {open === "photo" && <PhotoSheet />}
            <Overlays />
            {loginAsk && (
              <>
                <div className="sheet-bg" onClick={closeLogin}></div>
                <aside className="sheet" role="dialog" aria-label="Đăng nhập bằng Zalo">
                  <div className="sh-h">
                    <h2>Đăng nhập</h2>
                    <button className="x" onClick={closeLogin} aria-label="Đóng">
                      ✕
                    </button>
                  </div>
                  <div className="sh-b">
                    <p>Bạn đăng nhập bằng Zalo để đặt hàng, xem đơn và gửi ảnh.</p>
                  </div>
                  <div className="sh-f">
                    <button className="btn" onClick={startLogin}>
                      Đăng nhập bằng Zalo
                    </button>
                  </div>
                </aside>
              </>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
