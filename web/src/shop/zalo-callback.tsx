"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { failLogin, finishLogin } from "@/services/api";

/** Đổi oauth code một lần. Strict Mode gọi effect hai lần, nên khóa theo code. */
export default function ZaloCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [hint, setHint] = useState("Đang đăng nhập…");

  useEffect(() => {
    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");
    const mark = error ? "err" : code && state ? `ok:${code}` : "bad";
    if (sessionStorage.getItem("mt_zalo_callback") === mark) return;
    sessionStorage.setItem("mt_zalo_callback", mark);
    if (error || !code || !state) {
      failLogin("Bạn chưa đồng ý đăng nhập Zalo.");
      router.replace("/");
      return;
    }
    finishLogin(code, state)
      .then(() => {
        sessionStorage.removeItem("mt_zalo_callback");
        router.replace("/");
      })
      .catch((e: unknown) => {
        sessionStorage.removeItem("mt_zalo_callback");
        const message = e instanceof Error ? e.message : "Đăng nhập Zalo chưa xong. Bạn thử lại nhé.";
        setHint(message);
        failLogin(message);
        router.replace("/");
      });
  }, [params, router]);

  return (
    <main className="wrap">
      <div className="empty">{hint}</div>
    </main>
  );
}
