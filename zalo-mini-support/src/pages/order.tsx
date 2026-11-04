import { Page, useNavigate, useParams } from "zmp-ui";
import { Gate, Hold } from "@/components/gate";
import { BackBar, Face } from "@/components/shell";
import { useTalk } from "@/hooks/use-talk";
import { orderMessage } from "@/services/chat";
import { money, stateLabel, tone, totalLabel, when } from "@/services/format";
import { useDesk } from "@/state";

export default function OrderPage() {
  const { code = "" } = useParams();
  const { book } = useDesk();
  const navigate = useNavigate();
  const { busy, talk } = useTalk();
  const o = book?.orders.find((row) => row.code === code);

  return (
    <Page>
      <BackBar title={code || "Đơn"} sub={o ? `${o.kind === "request" ? "Tìm hộ" : "Đơn hàng"} · ${when(o.createdAt)}` : undefined} />
      <div className="screen bare">
        <Gate>
          {!o ? (
            <Hold title="Không thấy đơn này trong danh sách đã tải." />
          ) : (
            <>
              <section className="card who">
                <Face src={o.avatar} name={o.name} size={56} />
                <div className="grow">
                  <b className="nm">{o.name || "Khách"}</b>
                  <span className="meta">{o.phone || "Chưa có số điện thoại"}</span>
                </div>
                <span className={"tag " + tone(o)}>{stateLabel(o)}</span>
              </section>

              <section className="card">
                {o.kind === "request" && o.product ? <p className="product">{o.product}</p> : null}
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
                      <span className="nm">{i.name}</span>
                      {i.variantName ? <span className="meta">{i.variantName}</span> : null}
                    </div>
                    <span className="amt">
                      <b>×{i.qty}</b>
                      <span>{i.price ? money(i.price * i.qty) : "Chờ giá"}</span>
                    </span>
                  </div>
                ))}
                <div className="sums">
                  {o.subtotal ? (
                    <>
                      <div className="sum">
                        <span>Tạm tính</span>
                        <span>{money(o.subtotal)}</span>
                      </div>
                      <div className="sum">
                        <span>Phí giao</span>
                        <span>{o.shippingFee ? money(o.shippingFee) : "Miễn phí"}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="sum total">
                    <span>Tổng</span>
                    <b>{totalLabel(o)}</b>
                  </div>
                </div>
              </section>

              {o.addr || o.note ? (
                <section className="card">
                  {o.addr ? (
                    <p>
                      <span className="k">Địa chỉ</span>
                      {o.addr}
                    </p>
                  ) : null}
                  {o.note ? (
                    <p>
                      <span className="k">Ghi chú</span>
                      {o.note}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <div className="foot">
                {!o.zaloUserId ? <p className="hint">Khách chưa đăng nhập Zalo trên trang bán hàng.</p> : null}
                <button
                  type="button"
                  className="btn"
                  disabled={!o.zaloUserId || !!busy}
                  onClick={() => void talk(o.zaloUserId, orderMessage(book?.store || "", o))}
                >
                  {busy ? "Đang mở…" : "Nhắn Zalo"}
                </button>
                {o.kind === "order" && o.status === "confirmed" ? (
                  <button type="button" className="btn ghost" onClick={() => navigate(`/bill/${o.code}`)}>
                    {o.invoiceStatus === "sent" ? "Hoá đơn · đã gửi" : "Hoá đơn"}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </Gate>
      </div>
    </Page>
  );
}
