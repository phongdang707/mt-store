import { useMemo, useState } from "react";
import { useNavigate } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { Face, Shell } from "@/components/shell";
import { useTalk } from "@/hooks/use-talk";
import { orderMessage } from "@/services/chat";
import { norm, stateLabel, tone, totalLabel, when } from "@/services/format";
import { useDesk } from "@/state";
import type { Order } from "@/types";

const FILTERS = [
  { key: "all", label: "Tất cả", match: (_: Order) => true },
  { key: "pending", label: "Chờ xác nhận", match: (o: Order) => o.kind === "order" && o.status === "pending" },
  { key: "confirmed", label: "Đã xác nhận", match: (o: Order) => o.kind === "order" && o.status === "confirmed" },
  { key: "request", label: "Tìm hộ", match: (o: Order) => o.kind === "request" && o.status !== "cancelled" },
  { key: "cancelled", label: "Đã huỷ", match: (o: Order) => o.status === "cancelled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function OrdersPage() {
  const { book, bookError, reload } = useDesk();
  const { busy, talk } = useTalk();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");

  const all = book?.orders ?? [];
  const rows = useMemo(() => {
    const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    const needle = norm(q.trim());
    return all.filter((o) => {
      if (!match(o)) return false;
      if (!needle) return true;
      return norm([o.code, o.name, o.phone, o.product, ...o.items.map((i) => i.name)].join(" ")).includes(needle);
    });
  }, [all, filter, q]);

  return (
    <Shell
      tab="orders"
      sub={book ? `${book.orders.length} đơn` : "Đơn hàng"}
      placeholder="Tìm mã đơn, tên, số điện thoại, món"
      query={q}
      onQuery={book ? setQ : undefined}
      tools={
        book ? (
          <div className="chips">
            {FILTERS.map((f) => {
              const count = all.filter(f.match).length;
              return (
                <button key={f.key} type="button" className={"chip" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
                  {f.label}
                  {f.key !== "all" && count ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>
        ) : null
      }
    >
      <Gate>
        {!book ? (
          <Hold title={bookError || "Chưa tải được danh sách đơn."}>
            <button type="button" className="btn ghost" onClick={reload}>
              Thử lại
            </button>
          </Hold>
        ) : rows.length ? (
          <div className="list">
            {rows.map((o) => (
              <OrderCard key={o.code} order={o} busy={busy} onTalk={() => void talk(o.zaloUserId, orderMessage(book.store, o))} />
            ))}
          </div>
        ) : (
          <Hold title={q.trim() ? "Không có đơn khớp." : "Không có đơn trong mục này."} />
        )}
      </Gate>
    </Shell>
  );
}

function OrderCard({ order: o, busy, onTalk }: { order: Order; busy: string; onTalk: () => void }) {
  const navigate = useNavigate();
  return (
    <article className="card order">
      <button type="button" className="hit" onClick={() => navigate(`/order/${o.code}`)}>
        <Face src={o.avatar} name={o.name} size={44} />
        <span className="grow">
          <span className="row">
            <span className="nm">{o.name || "Khách"}</span>
            <span className={"tag " + tone(o)}>{stateLabel(o)}</span>
          </span>
          <span className="meta">{[o.code, when(o.createdAt)].filter(Boolean).join(" · ")}</span>
          <strong className="price">{totalLabel(o)}</strong>
        </span>
      </button>
      <button
        type="button"
        className={"talk" + (o.zaloUserId ? "" : " none")}
        aria-label={`Nhắn ${o.name || "khách"}`}
        aria-busy={!!o.zaloUserId && busy === o.zaloUserId}
        disabled={!!busy}
        onClick={onTalk}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3.2V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
        </svg>
      </button>
    </article>
  );
}
