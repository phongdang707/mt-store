import { Avatar, Button, Header, Icon, Page, Text, useNavigate, useParams } from "zmp-ui";
import { Gate } from "@/components/gate";
import { useTalk } from "@/hooks/use-talk";
import { orderMessage } from "@/services/chat";
import { money, stateLabel, totalLabel, when } from "@/services/format";
import { useDesk } from "@/state";

export default function OrderPage() {
  const { code = "" } = useParams();
  const { book } = useDesk();
  const navigate = useNavigate();
  const { busy, talk } = useTalk();
  const o = book?.orders.find((row) => row.code === code);

  return (
    <Page>
      <Header title={code || "Đơn"} />
      <div className="screen">
        <Gate>
          {!o ? (
            <Text>Không thấy đơn này trong danh sách đã tải.</Text>
          ) : (
            <>
              <div className="who">
                <Avatar src={o.avatar || undefined} size={56} />
                <div>
                  <Text bold>{o.name || "Khách"}</Text>
                  <Text size="small" className="muted">
                    {o.phone || "Chưa có số điện thoại"}
                  </Text>
                </div>
              </div>

              <Button
                fullWidth
                prefixIcon={<Icon icon="zi-chat" />}
                disabled={!o.zaloUserId}
                loading={!!busy}
                onClick={() => void talk(o.zaloUserId, orderMessage(book?.store || "", o))}
              >
                Nhắn khách qua Zalo
              </Button>
              {!o.zaloUserId ? <Text size="small">Khách chưa đăng nhập Zalo trên trang bán hàng nên chưa có user id để nhắn.</Text> : null}

              <section className="card">
                <div className="row">
                  <Text size="small" className="muted">
                    {o.kind === "request" ? "Yêu cầu tìm hộ" : "Đơn hàng"} · {when(o.createdAt)}
                  </Text>
                  <span className={"tag " + o.status}>{stateLabel(o)}</span>
                </div>
                {o.kind === "request" && o.product ? <Text>{o.product}</Text> : null}
                {o.photos.length ? (
                  <div className="photos">
                    {o.photos.map((src) => (
                      <img key={src} src={src} alt="" />
                    ))}
                  </div>
                ) : null}
                {o.items.map((i, idx) => (
                  <div key={idx} className="item">
                    {i.img ? <img src={i.img} alt="" /> : <div className="ph" />}
                    <div className="grow">
                      <Text size="small">{i.name}</Text>
                      {i.variantName ? (
                        <Text size="xSmall" className="muted">
                          {i.variantName}
                        </Text>
                      ) : null}
                    </div>
                    <Text size="small">
                      ×{i.qty} · {i.price ? money(i.price * i.qty) : "Chờ giá"}
                    </Text>
                  </div>
                ))}
                {o.subtotal ? (
                  <>
                    <div className="row">
                      <Text size="small">Tạm tính</Text>
                      <Text size="small">{money(o.subtotal)}</Text>
                    </div>
                    <div className="row">
                      <Text size="small">Phí giao</Text>
                      <Text size="small">{o.shippingFee ? money(o.shippingFee) : "Miễn phí"}</Text>
                    </div>
                  </>
                ) : null}
                <div className="row">
                  <Text bold>Tổng</Text>
                  <Text bold>{totalLabel(o)}</Text>
                </div>
              </section>

              {o.addr || o.note ? (
                <section className="card">
                  {o.addr ? (
                    <Text size="small">
                      <Icon icon="zi-location" size={16} /> {o.addr}
                    </Text>
                  ) : null}
                  {o.note ? (
                    <Text size="small">
                      <Icon icon="zi-note" size={16} /> {o.note}
                    </Text>
                  ) : null}
                </section>
              ) : null}

              {o.kind === "order" && o.status === "confirmed" ? (
                <Button variant="secondary" fullWidth onClick={() => navigate(`/bill/${o.code}`)}>
                  {o.invoiceStatus === "sent" ? "Hoá đơn · đã gửi" : "Gửi hoá đơn"}
                </Button>
              ) : null}
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
