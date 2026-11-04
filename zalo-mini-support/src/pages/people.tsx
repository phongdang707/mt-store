import { useMemo, useState } from "react";
import { Avatar, Button, Header, Input, List, Page, Text, useSnackbar } from "zmp-ui";
import { Gate } from "@/components/gate";
import { Tabs } from "@/components/tabs";
import { careMessage, openCareChat } from "@/services/chat";
import { useDesk } from "@/state";
import type { Invoice, Person } from "@/types";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
  const { desk } = useDesk();
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
    <Page>
      <Header title="Khách" showBackIcon={false} />
      <div className="screen">
        <Gate>
          <Text size="small">Nhắn theo Zalo user id đã lưu khi khách đăng nhập. Không cần Official Account.</Text>
          <Input.Search placeholder="Tìm tên hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
          {people.length ? (
            <List>
              {people.map((person) => (
                <List.Item
                  key={person.zaloUserId || person.phone || person.name}
                  title={person.name || "Khách"}
                  subTitle={person.phone || "Chưa có số điện thoại"}
                  prefix={<Avatar src={person.avatar || undefined} size={40} />}
                >
                  <Text size="xSmall">
                    {person.orders} đơn{person.open ? ` · ${person.open} cần gửi` : ""}
                  </Text>
                  <Button size="small" variant="secondary" disabled={!!busy || !person.zaloUserId} loading={busy === person.zaloUserId} onClick={() => void talk(person)}>
                    Nhắn Zalo
                  </Button>
                </List.Item>
              ))}
            </List>
          ) : (
            <Text>Chưa có khách trong các đơn đã xác nhận.</Text>
          )}
        </Gate>
      </div>
      <Tabs tab="people" />
    </Page>
  );
}
