import { useMemo, useState } from "react";
import { Avatar, Header, Icon, Input, List, Page, Text, useNavigate } from "zmp-ui";
import { Gate } from "@/components/gate";
import { Tabs } from "@/components/tabs";
import { useDesk } from "@/state";
import type { Invoice } from "@/types";

const money = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function QueuePage({ mode }: { mode: "todo" | "sent" }) {
  const { desk } = useDesk();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = norm(q.trim());
    return (desk?.invoices ?? []).filter((row) => {
      const sent = row.invoiceStatus === "sent";
      if (mode === "sent" ? !sent : sent) return false;
      if (!needle) return true;
      return norm([row.code, row.name, row.phone].join(" ")).includes(needle);
    });
  }, [desk, mode, q]);

  return (
    <Page>
      <Header title={mode === "todo" ? "Cần gửi" : "Đã gửi"} showBackIcon={false} />
      <div className="screen">
        <Gate>
          <Text size="small">Chọn đơn để mở chat Zalo với khách. Lời nhắn được điền sẵn, bạn gửi trong Zalo.</Text>
          <Input.Search placeholder="Tìm mã đơn, tên, số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} />
          {rows.length ? (
            <List>
              {rows.map((row) => (
                <List.Item
                  key={row.code}
                  title={row.name || "Khách"}
                  subTitle={line(row)}
                  prefix={<Avatar src={row.avatar || undefined} size={40} />}
                  suffix={<Icon icon="zi-arrow-right" />}
                  onClick={() => navigate(`/bill/${row.code}`)}
                />
              ))}
            </List>
          ) : (
            <Text>Không có hoá đơn trong mục này.</Text>
          )}
        </Gate>
      </div>
      <Tabs tab={mode} />
    </Page>
  );
}

function line(row: Invoice) {
  const phone = row.phone ? ` · ${row.phone}` : "";
  return `${row.code}${phone} · ${money(row.total)}`;
}
