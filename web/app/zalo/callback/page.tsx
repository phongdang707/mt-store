import { Suspense } from "react";
import ZaloCallback from "@/shop/zalo-callback";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="wrap">
          <div className="empty">Đang đăng nhập…</div>
        </main>
      }
    >
      <ZaloCallback />
    </Suspense>
  );
}
