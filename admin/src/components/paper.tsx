import type { ReactNode } from "react";
import LOGO from "@/logo.svg";
import { memoOf } from "@/invoice-image";
import { fmt, itemLabel } from "@/format";
import { sx } from "@/sx";
import type { Order, OrderItem, Settings } from "@/types";

const GRID = "display: grid; grid-template-columns: minmax(0, 1fr) 128px 104px 112px 32px; gap: 10px";
const GRID_RO = "display: grid; grid-template-columns: minmax(0, 1fr) 96px 104px 112px; gap: 10px";
const STEP = "width: 32px; height: 32px; border-radius: 50%; border: 1px solid #efd9d3; background: #fffaf7; color: #a3546a; font-weight: 700; font-size: 16px; padding: 0";

export type Shop = Pick<Settings, "store" | "tagline" | "zalo" | "bank">;

/** Tờ hoá đơn (màn Hoá đơn và trang xem hoá đơn công khai). Có `edit` thì hiện nút sửa số lượng. */
export function Paper({
  o,
  shop,
  edit,
  addSlot,
}: {
  o: Order;
  shop: Shop;
  edit?: { dec: (k: number) => void; inc: (k: number) => void; remove: (k: number) => void; busy: boolean };
  addSlot?: ReactNode;
}) {
  const d = new Date(o.createdAt);
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const bankLine = [shop.bank?.bank, shop.bank?.acc].filter(Boolean).join(" · ");
  const row = (it: OrderItem, k: number) => (
    <div key={k} className="inv-row" style={sx((edit ? GRID : GRID_RO) + "; align-items: center; padding: 12px 0; border-bottom: 1px dashed #efd9d3")}>
      <span style={sx("display: flex; align-items: center; gap: 10px; min-width: 0")}>
        <img src={it.img} alt="" style={sx("width: 40px; height: 40px; flex: 0 0 40px; border-radius: 10px; object-fit: contain; border: 1px solid #efd9d3")} />
        <span style={sx("display: flex; flex-direction: column; min-width: 0")}>
          <span style={sx("font-size: 14px; font-weight: 600; line-height: 1.3")}>{itemLabel(it)}</span>
          {it.addedLater ? <span style={sx("align-self: flex-start; font-size: 11px; font-weight: 700; color: #2f6b45; background: #e3efe6; border-radius: 6px; padding: 0 6px; margin-top: 2px")}>Khách thêm</span> : null}
        </span>
      </span>
      {edit ? (
        <span style={sx("display: flex; align-items: center; justify-content: center; gap: 6px")}>
          <button disabled={edit.busy} onClick={() => edit.dec(k)} aria-label="Bớt 1" style={sx(STEP)}>
            −
          </button>
          <b style={sx("min-width: 22px; text-align: center")}>{it.qty}</b>
          <button disabled={edit.busy} onClick={() => edit.inc(k)} aria-label="Thêm 1" style={sx(STEP)}>
            +
          </button>
        </span>
      ) : (
        <b style={sx("text-align: center")}>× {it.qty}</b>
      )}
      <span className="inv-unit" style={sx("text-align: right; font-size: 14px")}>{it.price ? fmt(it.price) : "Chờ báo giá"}</span>
      <b style={sx("text-align: right; font-size: 14.5px")}>{it.price ? fmt(it.price * it.qty) : "—"}</b>
      {edit ? (
        <button disabled={edit.busy} onClick={() => edit.remove(k)} aria-label="Bỏ sản phẩm" style={sx("width: 32px; height: 32px; border-radius: 50%; border: 0; background: transparent; color: #8f4459; display: flex; align-items: center; justify-content: center; padding: 0")}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"></path>
          </svg>
        </button>
      ) : null}
    </div>
  );
  return (
    <article className="paper" style={sx("background: #ffffff; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 14px 34px rgba(150, 90, 100, 0.14); padding: 32px 36px; display: flex; flex-direction: column; gap: 22px")}>
      <div style={sx("display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px")}>
        <div style={sx("display: flex; align-items: center; gap: 14px")}>
          <img src={LOGO} alt={shop.store} style={sx("width: 96px; height: auto")} />
          <div style={sx("display: flex; flex-direction: column")}>
            <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #a3546a")}>{shop.store}</span>
            {shop.tagline ? <span style={sx("font-size: 13px; color: #7d6862")}>{shop.tagline}</span> : null}
            {shop.zalo ? <span style={sx("font-size: 13px; color: #7d6862")}>Zalo: {shop.zalo}</span> : null}
          </div>
        </div>
        <div style={sx("display: flex; flex-direction: column; align-items: flex-end; gap: 2px")}>
          <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 22px; letter-spacing: 3px; color: #3d3530")}>HOÁ ĐƠN</span>
          <span style={sx("font-size: 13.5px; font-weight: 700; color: #a3546a")}>HĐ-{o.code}</span>
          <span style={sx("font-size: 13px; color: #7d6862")}>Ngày {date}</span>
        </div>
      </div>

      <div style={sx("display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; background: #fdf6f3; border-radius: 16px; padding: 14px 16px")}>
        <div style={sx("display: flex; flex-direction: column; gap: 2px")}>
          <span style={sx("font-size: 12px; font-weight: 700; color: #7d6862; letter-spacing: 0.6px")}>KHÁCH HÀNG</span>
          <b style={sx("font-size: 15px")}>{o.name || "Khách"}</b>
          <span style={sx("font-size: 13.5px")}>{o.phone}</span>
        </div>
        <div style={sx("display: flex; flex-direction: column; gap: 2px")}>
          <span style={sx("font-size: 12px; font-weight: 700; color: #7d6862; letter-spacing: 0.6px")}>GIAO ĐẾN</span>
          <span style={sx("font-size: 13.5px")}>{o.addr}</span>
          <span style={sx("font-size: 12.5px; color: #7d6862")}>Từ đơn #{o.code}</span>
        </div>
      </div>

      <div style={sx("display: flex; flex-direction: column")}>
        <div className="inv-table-head" style={sx((edit ? GRID : GRID_RO) + "; padding: 0 0 8px; border-bottom: 1.5px solid #3d3530; font-size: 12px; font-weight: 700; color: #6f5a55; letter-spacing: 0.4px")}>
          <span>SẢN PHẨM</span>
          <span style={{ textAlign: "center" }}>SỐ LƯỢNG</span>
          <span style={{ textAlign: "right" }}>ĐƠN GIÁ</span>
          <span style={{ textAlign: "right" }}>THÀNH TIỀN</span>
          {edit ? <span></span> : null}
        </div>
        {o.items.map(row)}
        {addSlot}
      </div>

      <div style={sx("display: flex; flex-wrap: wrap; justify-content: space-between; gap: 20px; align-items: flex-end")}>
        <div style={sx("flex: 1 1 240px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #6f5a55; background: #fdf6f3; border-radius: 14px; padding: 12px 14px")}>
          <b style={sx("color: #3d3530")}>Chuyển khoản</b>
          <span>{bankLine || "Shop gửi thông tin chuyển khoản qua Zalo"}</span>
          {shop.bank?.name ? <span>Chủ tài khoản: {shop.bank.name}</span> : null}
          <span>Nội dung: {memoOf(o)}</span>
        </div>
        <div style={sx("flex: 0 1 300px; display: flex; flex-direction: column; gap: 6px")}>
          <div style={sx("display: flex; justify-content: space-between; font-size: 14px")}>
            <span style={sx("color: #6f5a55")}>Tạm tính ({count} sản phẩm)</span>
            <span>{fmt(o.subtotal)}</span>
          </div>
          {o.shippingFee && o.subtotal ? (
            <div style={sx("display: flex; justify-content: space-between; font-size: 14px")}>
              <span style={sx("color: #6f5a55")}>Phí giao hàng</span>
              <span>{fmt(o.shippingFee)}</span>
            </div>
          ) : null}
          <div style={sx("display: flex; justify-content: space-between; align-items: baseline; border-top: 1.5px solid #3d3530; padding-top: 8px; margin-top: 4px")}>
            <b style={sx("font-size: 15px")}>TỔNG CỘNG</b>
            <b style={sx("font-size: 26px; color: #a3546a")}>{fmt(o.total)}</b>
          </div>
        </div>
      </div>

      <div style={sx("text-align: center; font-size: 13.5px; color: #7d6862; border-top: 1px dashed #efd9d3; padding-top: 14px")}>Cảm ơn bạn đã tin tưởng {shop.store}. Hẹn gặp lại bạn ở đơn sau!</div>
    </article>
  );
}
