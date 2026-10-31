import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api";
import { Paper, type Shop } from "@/components/paper";
import { memoOf } from "@/invoice-image";
import { sx } from "@/sx";
import type { Order } from "@/types";
import { qrDataURL, vietqr } from "@/vietqr";

/** Hoá đơn xem qua link shop gửi khách (không cần đăng nhập). */
export default function PublicInvoice() {
  const { token = "" } = useParams();
  const [data, setData] = useState<{ order: Order; shop: Shop & { qr: string } } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api
      .publicInvoice(token)
      .then((d) => setData(d as never))
      .catch((e) => setErr((e as Error).message));
  }, [token]);
  const qr = useMemo(() => (data && data.order.total && !data.order.paid ? qrDataURL(vietqr(data.shop.bank, data.order.total, memoOf(data.order))) || data.shop.qr : ""), [data]);
  return (
    <div style={sx("min-height: 100vh; box-sizing: border-box; padding: 32px 16px 48px; background: linear-gradient(180deg, #fcf8f0 0%, #f8efe8 45%, #f4dfda 100%); font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #3d3530; font-size: 15px; line-height: 1.45")}>
      <div style={sx("max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px")}>
        {err ? <p style={sx("text-align: center; color: #7d6862; padding: 60px 0")}>{err}</p> : null}
        {!data && !err ? <p style={sx("text-align: center; color: #7d6862; padding: 60px 0")}>Đang tải hoá đơn…</p> : null}
        {data ? (
          <>
            <Paper o={data.order} shop={data.shop} />
            {qr ? (
              <section style={sx("align-self: center; background: #ffffff; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 10px 26px rgba(150, 90, 100, 0.14); padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 8px")}>
                <b style={sx("font-family: Quicksand, sans-serif; color: #a3546a")}>Quét mã để chuyển khoản</b>
                <img src={qr} alt="Mã QR chuyển khoản" style={sx("width: 220px; height: 220px")} />
                <span style={sx("font-size: 13px; color: #7d6862; text-align: center")}>Số tiền và nội dung đã điền sẵn</span>
              </section>
            ) : data.order.paid ? (
              <p style={sx("text-align: center; background: #e3efe6; color: #2f6b45; border-radius: 14px; padding: 12px; font-weight: 700")}>✓ Bạn đã báo chuyển khoản, shop sẽ kiểm tra và xác nhận</p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
