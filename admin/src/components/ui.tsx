import { useState, type ReactNode } from "react";
import { api } from "@/api";
import { toast } from "@/app-state";
import { initialOf } from "@/format";
import { sx } from "@/sx";

export const SearchIcon = () => (
  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7"></circle>
    <path d="m20 20-3.5-3.5"></path>
  </svg>
);

export function Search({ label, placeholder, value, onChange, flex = "0 1 340px", minWidth = "220px" }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; flex?: string; minWidth?: string }) {
  return (
    <label style={{ position: "relative", flex, minWidth }}>
      <span style={sx("position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #7d6862; display: flex")}>
        <SearchIcon />
      </span>
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={sx("width: 100%; box-sizing: border-box; border: 1px solid #efd9d3; background: #fffaf7; border-radius: 999px; padding: 12px 16px 12px 40px; font: inherit; font-size: 14.5px; color: #3d3530")}
      />
    </label>
  );
}

/** Ảnh đại diện khách, không có ảnh thì chữ cái tên. */
export function Avatar({ src, name, size, ring = true, font }: { src?: string; name: string; size: number; ring?: boolean; font?: number }) {
  const ringCss = ring ? "border: 2px solid #ffffff; box-shadow: 0 0 0 1px #efd9d3" : "box-shadow: 0 0 0 1px #efd9d3";
  return src ? (
    <img src={src} alt="" style={sx(`width: ${size}px; height: ${size}px; flex: 0 0 ${size}px; border-radius: 50%; object-fit: cover; ${ringCss}`)} />
  ) : (
    <span
      style={sx(
        `width: ${size}px; height: ${size}px; flex: 0 0 ${size}px; box-sizing: border-box; border-radius: 50%; background: #f6e1dc; color: #8f4459; display: flex; align-items: center; justify-content: center; font-weight: 700; ${font ? `font-size: ${font}px; ` : ""}${ring ? "border: 2px solid #ffffff; box-shadow: 0 0 0 1px #efd9d3" : ""}`,
      )}
    >
      {initialOf(name)}
    </span>
  );
}

export const CHIP = {
  cho: "font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; background: #f6e1dc; color: #8f4459; white-space: nowrap",
  xong: "font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; background: #e3efe6; color: #2f6b45; white-space: nowrap",
  warn: "font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; background: #fdecc8; color: #7a4f00; white-space: nowrap",
  chan: "font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; background: #3d3530; color: #ffffff; white-space: nowrap",
};

export function Tabs<T extends string>({ tabs, value, onPick }: { tabs: [T, string, number][]; value: T; onPick: (t: T) => void }) {
  return (
    <div className="tabs-row" style={sx("display: flex; flex-wrap: wrap; gap: 8px")}>
      {tabs.map(([id, l, n]) => (
        <button
          key={id}
          onClick={() => onPick(id)}
          style={sx(
            "box-sizing: border-box; border-radius: 999px; padding: 9px 16px; font-weight: 600; font-size: 14px; " +
              (id === value ? "border: 1.5px solid #b3566f; background: #b3566f; color: #ffffff" : "border: 1px solid #efd9d3; background: #fffaf7; color: #6f5a55"),
          )}
        >
          {l} <span style={{ opacity: 0.85 }}>· {n}</span>
        </button>
      ))}
    </div>
  );
}

/** Nhóm nút dạng viên thuốc trên nền hồng (chọn tháng, lọc hoá đơn). */
export function Segmented<T extends string | number>({ label, items, value, onPick }: { label: string; items: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} style={sx("display: flex; gap: 4px; background: #f6e1dc; border-radius: 999px; padding: 4px; flex-wrap: wrap")}>
      {items.map(([v, l]) => (
        <button
          key={String(v)}
          onClick={() => onPick(v)}
          aria-pressed={v === value}
          style={sx("box-sizing: border-box; border: 0; border-radius: 999px; padding: 7px 14px; font-weight: 600; font-size: 13.5px; " + (v === value ? "background: #b3566f; color: #ffffff" : "background: transparent; color: #8f4459"))}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export const H1 = ({ children }: { children: ReactNode }) => (
  <h1 style={sx("margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 30px; color: #a3546a; letter-spacing: 0.3px")}>{children}</h1>
);

export const PhoneIcon = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path>
  </svg>
);
export const ChatIcon = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v11H9l-5 4z"></path>
  </svg>
);
export const PinIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3546a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={sx("flex: 0 0 16px; margin-top: 2px")}>
    <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"></path>
    <circle cx="12" cy="9" r="2.5"></circle>
  </svg>
);
const PILL = "display: inline-flex; align-items: center; gap: 6px; border: 1px solid #efd9d3; background: #ffffff; border-radius: 999px; padding: 7px 12px; text-decoration: none; font-weight: 600; font-size: 13.5px";
/** Gọi điện + Nhắn Zalo của khách. */
export function ContactPills({ phone }: { phone: string }) {
  const tel = phone.replace(/[^0-9+]/g, "");
  let z = phone.replace(/\D/g, "");
  if (z.startsWith("84")) z = "0" + z.slice(2);
  return (
    <div style={sx("display: flex; flex-wrap: wrap; gap: 8px")}>
      {tel ? (
        <a href={"tel:" + tel} style={sx(PILL)}>
          <PhoneIcon />
          {phone}
        </a>
      ) : null}
      {z.length >= 9 ? (
        <a href={"https://zalo.me/" + z} target="_blank" rel="noopener" style={sx(PILL)}>
          <ChatIcon />
          Nhắn Zalo
        </a>
      ) : null}
    </div>
  );
}

export function ConfirmBlock({ pending, onToggle, busy, what }: { pending: boolean; onToggle: () => void; busy?: boolean; what: "đơn" | "yêu cầu" }) {
  return pending ? (
    <>
      <button
        onClick={onToggle}
        disabled={busy}
        style={sx("display: flex; align-items: center; justify-content: center; gap: 10px; border: 0; background: #b3566f; color: #ffffff; border-radius: 14px; padding: 14px; font-weight: 700; font-size: 15.5px; box-shadow: 0 8px 20px rgba(150, 90, 100, 0.22)" + (busy ? "; opacity: 0.7" : ""))}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7"></path>
        </svg>
        Xác nhận đã nhận {what}
      </button>
      <span style={sx("font-size: 12.5px; color: #7d6862; text-align: center")}>Khách sẽ thấy {what} chuyển sang “Đã xác nhận”</span>
    </>
  ) : (
    <div style={sx("display: flex; align-items: center; gap: 10px; background: #e3efe6; color: #2f6b45; border-radius: 14px; padding: 12px 14px")}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M8 12l3 3 5-6"></path>
      </svg>
      <span style={sx("flex: 1; font-weight: 700; font-size: 14.5px")}>Đã xác nhận · khách đã được báo</span>
      <button onClick={onToggle} disabled={busy} style={sx("border: 0; background: transparent; color: #2f6b45; font-weight: 600; font-size: 13px; text-decoration: underline; padding: 6px 2px")}>
        Hoàn tác
      </button>
    </div>
  );
}

/** Chặn hoặc bỏ chặn một khách. Hỏi lại trước khi gọi API. */
export function BlockCustomer({ id, blocked, onChange }: { id: string; blocked?: boolean; onChange: (blocked: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const on = !!blocked;
  const run = async () => {
    const next = !on;
    const ask = next ? "Chặn người này? Họ sẽ không đặt hàng hay gửi yêu cầu được nữa." : "Bỏ chặn người này? Họ dùng cửa hàng lại được.";
    if (!confirm(ask)) return;
    setBusy(true);
    try {
      const r = await api.blockCustomer(id, next);
      onChange(r.blocked);
      toast(r.blocked ? "Đã chặn người dùng" : "Đã bỏ chặn");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      style={sx(
        "border: 1.5px solid #b3566f; background: #ffffff; color: #a3546a; border-radius: 14px; padding: 12px 14px; font-weight: 700; font-size: 14.5px" +
          (busy ? "; opacity: 0.7" : ""),
      )}
    >
      {on ? "Bỏ chặn" : "Chặn người dùng"}
    </button>
  );
}

export const CloseX = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} style={sx("width: 36px; height: 36px; flex: 0 0 36px; border-radius: 50%; border: 1px solid #efd9d3; background: #ffffff; color: #6f5a55; display: flex; align-items: center; justify-content: center; padding: 0")}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18"></path>
    </svg>
  </button>
);
