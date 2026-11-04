import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { Shell } from "@/components/shell";
import { money, norm } from "@/services/format";
import { useDesk } from "@/state";
import type { InvoiceStatus } from "@/types";

const STATUS: Record<InvoiceStatus, string> = {
  new: "Chưa gửi",
  changed: "Cần gửi lại",
  sent: "Đã gửi",
};

export default function BillsPage() {
  const { desk, me, loading, error } = useDesk();
  const ready = me?.role === "support" && !loading && !error;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const mode = params.get("view") === "sent" ? "sent" : "todo";

  const all = desk?.invoices ?? [];
  const todo = all.filter((row) => row.invoiceStatus !== "sent").length;
  const sent = all.length - todo;
  const rows = useMemo(() => {
    const needle = norm(q.trim());
    return all.filter((row) => {
      const isSent = row.invoiceStatus === "sent";
      if (mode === "sent" ? !isSent : isSent) return false;
      if (!needle) return true;
      return norm([row.code, row.name, row.phone].join(" ")).includes(needle);
    });
  }, [all, mode, q]);

  const setMode = (next: "todo" | "sent") => {
    setParams(next === "sent" ? { view: "sent" } : {}, { replace: true });
  };

  return (
    <Shell
      tab="bills"
      sub={desk ? `${todo} cần gửi` : "Hoá đơn"}
      placeholder="Tìm mã đơn, tên, số điện thoại"
      query={q}
      onQuery={ready ? setQ : undefined}
      tools={
        ready ? (
          <div className="seg" role="group" aria-label="Lọc hoá đơn">
            <button type="button" className={mode === "todo" ? "on" : ""} onClick={() => setMode("todo")}>
              Cần gửi{desk ? ` · ${todo}` : ""}
            </button>
            <button type="button" className={mode === "sent" ? "on" : ""} onClick={() => setMode("sent")}>
              Đã gửi{desk ? ` · ${sent}` : ""}
            </button>
          </div>
        ) : null
      }
    >
      <Gate>
        {rows.length ? (
          <div className="list">
            {rows.map((row) => (
              <button key={row.code} type="button" className="card bill" onClick={() => navigate(`/bill/${row.code}`)}>
                <span className="grow">
                  <b className="nm">{row.name || "Khách"}</b>
                  <small>{[row.code, row.phone].filter(Boolean).join(" · ")}</small>
                </span>
                <span className="end">
                  <strong>{money(row.total)}</strong>
                  <em className={row.invoiceStatus === "sent" ? "ok" : "due"}>{STATUS[row.invoiceStatus]}</em>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Hold title={emptyCopy(q, mode)} />
        )}
      </Gate>
    </Shell>
  );
}

function emptyCopy(q: string, mode: "todo" | "sent") {
  if (q.trim()) return "Không có hoá đơn khớp.";
  return mode === "todo" ? "Không có hoá đơn cần gửi." : "Chưa gửi hoá đơn nào.";
}
