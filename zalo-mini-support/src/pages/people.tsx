import { useMemo, useState } from "react";
import { useSnackbar } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { Face, Shell } from "@/components/shell";
import { careMessage, openCareChat } from "@/services/chat";
import { norm } from "@/services/format";
import { useDesk } from "@/state";
import type { Invoice, Person } from "@/types";

function peopleOf(invoices: Invoice[]) {
  const map = new Map<string, Person>();
  for (const row of invoices) {
    const key = row.zaloUserId || `missing:${row.phone}:${row.name}`;
    const cur = map.get(key);
    const open = row.invoiceStatus === "sent" ? 0 : 1;
    if (!cur) {
      map.set(key, {
        zaloUserId: row.zaloUserId,
        name: row.name,
        avatar: row.avatar,
        phone: row.phone,
        orders: 1,
        open,
      });
      continue;
    }
    cur.orders += 1;
    cur.open += open;
    if (!cur.name && row.name) cur.name = row.name;
    if (!cur.phone && row.phone) cur.phone = row.phone;
    if (!cur.avatar && row.avatar) cur.avatar = row.avatar;
  }
  return [...map.values()];
}

export default function PeoplePage() {
  const { desk, me, loading, error } = useDesk();
  const ready = me?.role === "support" && !loading && !error;
  const { openSnackbar } = useSnackbar();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const people = useMemo(() => {
    const needle = norm(q.trim());
    return peopleOf(desk?.invoices ?? []).filter((person) => {
      if (!needle) return true;
      return norm([person.name, person.phone].join(" ")).includes(needle);
    });
  }, [desk, q]);

  const talk = async (person: Person) => {
    if (busy) return;
    if (!person.zaloUserId) {
      openSnackbar({ text: "Chưa có Zalo user id của khách", type: "error" });
      return;
    }
    setBusy(person.zaloUserId);
    try {
      await openCareChat(person.zaloUserId, careMessage(desk?.store || "", person.name));
      openSnackbar({ text: "Đã mở cuộc trò chuyện. Bạn gửi tin trong Zalo.", type: "success" });
    } catch (error) {
      openSnackbar({ text: error instanceof Error ? error.message : "Chưa mở được cuộc trò chuyện", type: "error" });
    } finally {
      setBusy("");
    }
  };

  return (
    <Shell
      tab="people"
      sub={people.length ? `${people.length} khách` : "Khách"}
      placeholder="Tìm tên hoặc số điện thoại"
      query={q}
      onQuery={ready ? setQ : undefined}
    >
      <Gate>
        {people.length ? (
          <div className="list">
            {people.map((person) => (
              <article key={person.zaloUserId || person.phone || person.name} className="card person">
                <Face src={person.avatar} name={person.name} size={44} />
                <div className="grow">
                  <b className="nm">{person.name || "Khách"}</b>
                  <span className="meta">{person.phone || "Chưa có số điện thoại"}</span>
                  <span className="meta">
                    {person.orders} đơn{person.open ? ` · ${person.open} cần gửi` : ""}
                  </span>
                </div>
                <button type="button" className="btn slim" disabled={!!busy || !person.zaloUserId} onClick={() => void talk(person)}>
                  {busy === person.zaloUserId ? "…" : "Nhắn"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Hold title={q.trim() ? "Không có khách khớp." : "Chưa có khách trong các đơn đã xác nhận."} />
        )}
      </Gate>
    </Shell>
  );
}
