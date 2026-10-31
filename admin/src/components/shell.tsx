import { useEffect, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "@/app-state";
import LOGO from "@/logo.svg";
import { sx } from "@/sx";

const ICON = {
  orders: (s = 20) => (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"></path>
      <path d="M9 8h6M9 12h6"></path>
    </svg>
  ),
  products: (s = 20) => (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6z"></path>
      <path d="M9 8a3 3 0 0 1 6 0"></path>
    </svg>
  ),
  requests: (s = 20) => (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z"></path>
      <circle cx="12" cy="13" r="3.5"></circle>
    </svg>
  ),
  invoices: (s = 20) => (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v13H7z"></path>
      <path d="M14 3v5h5"></path>
      <path d="M10 13h6M10 17h4"></path>
    </svg>
  ),
  settings: (s = 20) => (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12z"></path>
    </svg>
  ),
};

type Key = keyof typeof ICON;
const NAV: [Key, string, string, string][] = [
  ["orders", "/", "Đơn hàng", "Đơn hàng"],
  ["products", "/san-pham", "Sản phẩm", "Sản phẩm"],
  ["requests", "/tim-ho", "Yêu cầu tìm hộ", "Tìm hộ"],
  ["invoices", "/hoa-don", "Hoá đơn", "Hoá đơn"],
  ["settings", "/cai-dat", "Cài đặt cửa hàng", "Cài đặt"],
];

const PILL_ON = "background: #ffffff; color: #a3546a; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 1px 8px";
const PILL: Record<Key, string> = {
  orders: "background: #b3566f; color: #ffffff; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 1px 8px",
  products: "background: #f6e1dc; color: #8f4459; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 1px 8px",
  requests: "background: #fdecc8; color: #7a4f00; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 1px 8px",
  invoices: "background: #fdecc8; color: #7a4f00; border-radius: 999px; font-size: 12px; font-weight: 700; padding: 1px 8px",
  settings: "",
};

/**
 * 3 bố cục khung của thiết kế:
 * - `scroll` (Đơn hàng, Tìm hộ, Cài đặt): cao đúng màn hình, cột nội dung tự cuộn.
 * - `fixed` (Sản phẩm): sidebar cố định 248px, lưới và khung sửa cuộn riêng.
 * - `flow` (Hoá đơn): trang dài, cuộn cả trang.
 */
export type ShellVariant = "scroll" | "fixed" | "flow";

const ROOT: Record<ShellVariant, string> = {
  scroll: "height: 100vh; overflow: hidden; display: flex; ",
  fixed: "height: 100vh; overflow: hidden; display: flex; ",
  flow: "min-height: 100vh; display: flex; flex-wrap: wrap; ",
};
const ASIDE: Record<ShellVariant, string> = {
  scroll: "flex: 1 1 240px; max-width: 264px; min-width: 220px; flex-shrink: 0; height: 100%; overflow-y: auto; z-index: 3; ",
  fixed: "flex: 0 0 248px; height: 100%; overflow-y: auto; ",
  flow: "flex: 1 1 240px; max-width: 264px; min-width: 220px; ",
};
/** Cột nội dung (thẻ <main>) của từng bố cục, chép từ thiết kế. */
export const MAIN: Record<ShellVariant, string> = {
  scroll: "flex: 999 1 560px; min-width: 0; height: 100%; overflow-y: auto; box-sizing: border-box; padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 20px",
  fixed: "flex: 1 1 auto; min-width: 0; height: 100%; box-sizing: border-box; padding: 28px 32px 24px; display: flex; flex-direction: column; gap: 20px",
  flow: "flex: 999 1 560px; min-width: 0; box-sizing: border-box; padding: 28px 32px 48px; display: flex; flex-direction: column; gap: 20px",
};

const Dot = () => <span aria-label="Có mới" style={sx("position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 50%; background: #e0475e; box-shadow: 0 0 0 2px #fffaf7")}></span>;

function Sidebar({ variant }: { variant: ShellVariant }) {
  const { badges, me, logout, settings, alerts } = useApp();
  const dot: Partial<Record<Key, boolean>> = { orders: alerts.orders, requests: alerts.requests };
  const count: Record<Key, number | null> = {
    orders: badges.pendingOrders,
    products: badges.products,
    requests: badges.pendingRequests,
    invoices: badges.unsentInvoices,
    settings: null,
  };
  const store = settings?.storefrontUrl || import.meta.env.VITE_STOREFRONT_URL || "";
  return (
    <aside
      className="only-desktop"
      style={sx(
        ASIDE[variant] +
          "box-sizing: border-box; padding: 24px 16px; display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #efd9d3; background: rgba(255, 250, 247, 0.7)",
      )}
    >
      <div style={sx("display: flex; align-items: center; gap: 10px; padding: 0 8px 18px")}>
        <img src={settings?.logo || LOGO} alt={settings?.store || "MT store"} style={sx("width: 72px; height: auto")} />
        <div style={sx("display: flex; flex-direction: column")}>
          <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 16px; color: #a3546a; letter-spacing: 0.5px")}>Quản lý</span>
          <span style={sx("font-size: 12.5px; color: #7d6862")}>Hàng xách tay</span>
        </div>
      </div>
      {NAV.map(([k, to, label]) => (
        <NavLink
          key={k}
          to={to}
          end
          className={({ isActive }) => "nav-a" + (isActive ? " on" : "")}
          style={({ isActive }) =>
            sx("display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 14px; text-decoration: none; font-weight: 600; " + (isActive ? "background: #b3566f; color: #ffffff" : "color: #3d3530"))
          }
        >
          {({ isActive }) => (
            <>
              <span style={sx("position: relative; display: flex")}>
                {ICON[k]()}
                {dot[k] ? <Dot /> : null}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              {count[k] ? <span style={sx(isActive ? PILL_ON : PILL[k])}>{count[k]}</span> : null}
            </>
          )}
        </NavLink>
      ))}
      <div style={sx("flex: 1; min-height: 24px")}></div>
      {store ? (
        <a
          href={store}
          target="_blank"
          rel="noopener"
          style={sx("display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 14px; border: 1px solid #efd9d3; background: #fffaf7; color: #a3546a; text-decoration: none; font-weight: 600; font-size: 14px")}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6"></path>
            <path d="M20 4l-9 9"></path>
            <path d="M18 14v5H5V6h5"></path>
          </svg>
          Xem trang bán hàng
        </a>
      ) : null}
      <div style={sx("display: flex; align-items: center; gap: 10px; padding: 14px 8px 0")}>
        <span style={sx("width: 36px; height: 36px; flex: 0 0 36px; border-radius: 50%; background: #f6e1dc; color: #8f4459; display: flex; align-items: center; justify-content: center; font-weight: 700")}>
          {(settings?.store || "M").trim().charAt(0).toUpperCase()}
        </span>
        <div style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column")}>
          <span style={sx("font-weight: 600; font-size: 14px")}>{me?.name || "Chủ shop"}</span>
          <span style={sx("font-size: 12.5px; color: #7d6862; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>{me?.email}</span>
        </div>
        <button
          onClick={logout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          style={sx("width: 40px; height: 40px; flex: 0 0 40px; border-radius: 12px; border: 1px solid #efd9d3; background: #fffaf7; color: #7d6862; display: flex; align-items: center; justify-content: center")}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4h4v16h-4"></path>
            <path d="M10 8l-4 4 4 4"></path>
            <path d="M6 12h10"></path>
          </svg>
        </button>
      </div>
    </aside>
  );
}

/** Thanh tab dưới trên điện thoại (bản "Điện thoại – Đơn hàng"). */
function BottomNav() {
  const { badges, alerts } = useApp();
  const items = NAV.filter(([k]) => k !== "invoices");
  return (
    <nav
      aria-label="Điều hướng"
      className="only-mobile bottom-nav"
      style={sx("position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid #efd9d3; background: #fffaf7; padding: 8px 6px calc(14px + env(safe-area-inset-bottom, 0px))")}
    >
      {items.map(([k, to, , short]) => (
        <NavLink
          key={k}
          to={to}
          end
          style={({ isActive }) =>
            sx(
              "position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; font-size: 11.5px; padding: 6px 0; " +
                (isActive ? "color: #a3546a; font-weight: 700" : "color: #7d6862; font-weight: 600"),
            )
          }
        >
          <span style={sx("position: relative; display: flex")}>
            {ICON[k](22)}
            {(k === "orders" && alerts.orders) || (k === "requests" && alerts.requests) ? <Dot /> : null}
          </span>
          {short}
          {k === "orders" && badges.pendingOrders ? (
            <span style={sx("position: absolute; top: 0; left: calc(50% + 6px); background: #b3566f; color: #fff; border-radius: 999px; font-size: 10.5px; font-weight: 700; padding: 0 6px")}>{badges.pendingOrders}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

export function Shell({ children, fixed, variant }: { children: ReactNode; fixed?: boolean; variant?: ShellVariant }) {
  const v: ShellVariant = variant ?? (fixed ? "fixed" : "scroll");
  const { pathname } = useLocation();
  const { clearAlert } = useApp();
  useEffect(() => {
    if (pathname === "/") clearAlert("orders");
    if (pathname === "/tim-ho") clearAlert("requests");
  }, [pathname, clearAlert]);
  return (
    <div
      className={"shell-root shell-" + v}
      style={sx(ROOT[v] + "background: linear-gradient(180deg, #fcf8f0 0%, #f8efe8 45%, #f4dfda 100%); font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #3d3530; font-size: 15px; line-height: 1.45")}
    >
      <Sidebar variant={v} />
      {children}
      <BottomNav />
    </div>
  );
}

/** Đầu trang trên điện thoại: logo + tiêu đề + dòng phụ (bản Mobile). */
export function MobileHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  const { settings } = useApp();
  return (
    <header className="only-mobile" style={sx("margin: -18px -16px 4px; padding: 18px 18px 12px; align-items: center; gap: 12px; border-bottom: 1px solid #efd9d3; background: rgba(255, 250, 247, 0.85)")}>
      <img src={settings?.logo || LOGO} alt={settings?.store || "MT store"} style={sx("width: 58px; height: auto")} />
      <div style={sx("flex: 1; display: flex; flex-direction: column")}>
        <span style={sx("font-family: Quicksand, sans-serif; font-weight: 700; font-size: 20px; color: #a3546a; line-height: 1.2")}>{title}</span>
        {sub ? <span style={sx("font-size: 12.5px; color: #7d6862")}>{sub}</span> : null}
      </div>
      {action}
    </header>
  );
}
