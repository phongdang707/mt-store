import type { ReactNode } from "react";
import { Avatar, Page, useNavigate } from "zmp-ui";
import { useDesk } from "@/state";

export function Face({ src, name, size }: { src?: string; name?: string; size: number }) {
  const letter = (name || "").trim().charAt(0).toUpperCase();
  return (
    <Avatar src={src || undefined} size={size}>
      {letter || (
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} aria-hidden="true">
          <circle cx="12" cy="8" r="3.1" fill="currentColor" />
          <path fill="currentColor" d="M5.2 19.2c.7-3.3 3.3-5 6.8-5s6.1 1.7 6.8 5" />
        </svg>
      )}
    </Avatar>
  );
}

const TABS = [
  { key: "orders", label: "Đơn", to: "/" },
  { key: "bills", label: "Hoá đơn", to: "/bills" },
  { key: "people", label: "Khách", to: "/people" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function Shell({
  tab,
  sub,
  placeholder,
  query,
  onQuery,
  tools,
  children,
}: {
  tab: TabKey;
  sub: string;
  placeholder?: string;
  query?: string;
  onQuery?: (value: string) => void;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const { me, book, desk } = useDesk();
  const navigate = useNavigate();
  const title = book?.store || desk?.store || "MT Chăm sóc";

  return (
    <Page>
      <header className="top">
        <div className="top-row">
          <div className="grow">
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>
          <button type="button" className="me" onClick={() => navigate("/me")} aria-label="Tài khoản">
            <Face src={me?.avatar} name={me?.name} size={36} />
          </button>
        </div>
        {onQuery ? (
          <label className="find">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16.5 20.5 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder={placeholder}
              aria-label={placeholder || "Tìm"}
              value={query ?? ""}
              autoComplete="off"
              onChange={(e) => onQuery(e.target.value)}
            />
          </label>
        ) : null}
        {tools}
      </header>
      <div className="screen">{children}</div>
      <nav className="dock" aria-label="Mục chính">
        <div className="dock-in">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "on" : ""}
              aria-current={tab === item.key ? "page" : undefined}
              onClick={() => {
                if (tab !== item.key) navigate(item.to);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </Page>
  );
}

export function BackBar({ title, sub }: { title: string; sub?: string }) {
  const navigate = useNavigate();
  return (
    <header className="top">
      <div className="top-row">
        <button type="button" className="back" onClick={() => navigate(-1)} aria-label="Quay lại">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="grow">
          <h1>{title}</h1>
          {sub ? <p>{sub}</p> : null}
        </div>
      </div>
    </header>
  );
}
