import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Page } from "zmp-ui";
import { Catalog, Dock, Header } from "@/components/catalog";
import { Overlays } from "@/components/overlays";
import { CartSheet, OrdersSheet, PhotoSheet, PickSheet } from "@/components/sheets";
import { useStore } from "@/state/store";

export default function HomePage() {
  const { D, loadError, loadCatalog, open, setOpen, blocked } = useStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (blocked) {
    return (
      <Page>
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
      </Page>
    );
  }

  return (
    <Page>
      <Header />
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
      {/* Lớp nổi gắn vào body để `position: fixed` không bị transform của router ảnh hưởng */}
      {createPortal(
        <>
          {D && !open && <Dock />}
          {open === "cart" && <CartSheet />}
          {open === "pick" && <PickSheet />}
          {open === "orders" && <OrdersSheet />}
          {open === "photo" && <PhotoSheet />}
          <Overlays />
        </>,
        document.body,
      )}
    </Page>
  );
}
