import { useMemo, useState } from "react";
import { Avatar, Button, Header, Icon, Input, List, Page, Text, useNavigate } from "zmp-ui";
import { Gate } from "@/components/gate";
import { Tabs } from "@/components/tabs";
import { useTalk } from "@/hooks/use-talk";
import { orderMessage } from "@/services/chat";
import { money, norm, stateLabel, when } from "@/services/format";
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
  const navigate = useNavigate();
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
    <Page>
      <Header title="Đơn hàng" showBackIcon={false} />
      <div className="screen">
        <Gate>
          {!book ? (
            <>
              <Text>{bookError || "Chưa tải được danh sách đơn."}</Text>
              <Button variant="secondary" fullWidth onClick={reload}>
                Thử lại
              </Button>
            </>
          ) : (
            <>
              <Input.Search placeholder="Tìm mã đơn, tên, số điện thoại, món" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="chips">
                {FILTERS.map((f) => {
                  const count = all.filter(f.match).length;
                  return (
                    <button key={f.key} type="button" className={"chip" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
                      {f.label}
                      {f.key !== "all" && count ? ` ${count}` : ""}
                    </button>
                  );
                })}
              </div>
              {rows.length ? (
                <List>
                  {rows.map((o) => (
                    <List.Item
                      key={o.code}
                      title={o.name || "Khách"}
                      subTitle={[o.code, stateLabel(o), o.total ? money(o.total) : ""].filter(Boolean).join(" · ")}
                      prefix={<Avatar src={o.avatar || undefined} size={40} />}
                      suffix={
                        <Button
                          size="small"
                          variant="tertiary"
                          icon={<Icon icon="zi-chat" />}
                          disabled={!!busy || !o.zaloUserId}
                          loading={!!o.zaloUserId && busy === o.zaloUserId}
                          aria-label={`Nhắn ${o.name || "khách"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void talk(o.zaloUserId, orderMessage(book.store, o));
                          }}
                        />
                      }
                      onClick={() => navigate(`/order/${o.code}`)}
                    >
                      <Text size="xSmall" className="muted">
                        {when(o.createdAt)}
                        {o.phone ? ` · ${o.phone}` : ""}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text>Không có đơn trong mục này.</Text>
              )}
            </>
          )}
        </Gate>
      </div>
      <Tabs tab="orders" />
    </Page>
  );
}
