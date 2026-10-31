import { itemName } from "@/services/order-image";
import { useStore } from "@/state/store";
import type { Order } from "@/types";
import { fmt, nf } from "@/utils/format";
import { copyText } from "@/utils/toast";
import { Ph } from "./catalog";

const Bg = () => {
  const { setOpen } = useStore();
  return <div className="sheet-bg" onClick={() => setOpen(null)}></div>;
};

const Head = ({ title }: { title: string }) => {
  const { setOpen } = useStore();
  return (
    <div className="sh-h">
      <h2>{title}</h2>
      <button className="x" onClick={() => setOpen(null)} aria-label="Đóng">
        ✕
      </button>
    </div>
  );
};

export function PickSheet() {
  const { pick, setPick, byId, cart, addPick, setOpen } = useStore();
  const p = pick && byId(pick.id);
  if (!p || !pick) return null;
  const s = pick.sel,
    vr = s != null ? p.variants[s] : null,
    vl = p.vlabel || "tone";
  return (
    <>
      <Bg />
      <div className="pick" role="dialog" aria-label={`Chọn tone ${p.name}`}>
        <div className="pk-h">
          <div>
            <h2>{p.name}</h2>
            <p>
              {p.price ? fmt(p.price) : "Giá đang cập nhật"} · {p.variants.length} {p.vlabel || "tone màu"}
            </p>
          </div>
          <button className="x" onClick={() => setOpen(null)} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="pk-prev">
          {vr ? (
            <>
              <img src={vr.img} alt={vr.name} />
              <b>{vr.name}</b>
            </>
          ) : (
            <>
              <img src={p.img} alt="" />
              <b className="hint">Chọn một {vl} bên dưới nhé</b>
            </>
          )}
        </div>
        <div className="pk-g">
          {p.variants.map((v, i) => {
            const inC = cart[p.id + "::" + i] || 0;
            return (
              <button key={i} className={`vt-t ${i === s ? "on" : ""}`} onClick={() => setPick({ ...pick, sel: i })}>
                <img src={v.img} alt="" />
                <span>{v.name}</span>
                {inC ? <i>{inC} trong giỏ</i> : null}
              </button>
            );
          })}
        </div>
        <div className="pk-f">
          <div className="step pq">
            <button onClick={() => setPick({ ...pick, qty: Math.max(1, pick.qty - 1) })} aria-label="Bớt">
              −
            </button>
            <span>{pick.qty}</span>
            <button onClick={() => setPick({ ...pick, qty: Math.min(99, pick.qty + 1) })} aria-label="Thêm">
              +
            </button>
          </div>
          <button className="btn" id="pick-add" disabled={s == null} onClick={addPick}>
            {s == null
              ? p.price
                ? "Chọn " + vl + " để thêm"
                : "Chọn " + vl + " để lưu"
              : p.price
                ? "Thêm vào giỏ · " + fmt(p.price * pick.qty)
                : "♡ Lưu tone · chờ báo giá"}
          </button>
        </div>
      </div>
    </>
  );
}

export function CartSheet() {
  const { D, entries, ck, setQty, cartTotal, pendingCount, info, setInfo, remember, setRemember, msg, sending, sendOrder, orderText, clearCart } = useStore();
  if (!D) return null;
  return (
    <>
      <Bg />
      <aside className="sheet" role="dialog" aria-label="Đơn hàng">
        <Head title="GIỎ HÀNG" />
        <div className="sh-b">
          {entries.length ? (
            <>
              {entries.map(([id, q]) => {
                const c = ck(id)!,
                  p = c.p;
                return (
                  <div className="ci" key={id}>
                    <div className="ph">{c.vr ? <img src={c.vr.img} alt="" /> : <Ph p={p} />}</div>
                    <div className="t">
                      <b>{p.name}</b>
                      {c.vr ? <span className="vt">Tone: {c.vr.name}</span> : null}
                      <small>{p.price ? fmt(p.price) : "Chờ báo giá"}</small>
                    </div>
                    <div className="step">
                      <button onClick={() => setQty(id, q - 1)} aria-label="Bớt">
                        −
                      </button>
                      <span>{q}</span>
                      <button onClick={() => setQty(id, q + 1)} aria-label="Thêm">
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="tot">
                <span>Tạm tính</span>
                <b>{fmt(cartTotal)}</b>
              </div>
              {pendingCount ? (
                <p className="pend">
                  + {pendingCount} món chờ báo giá, {D.store} sẽ báo giá khi chốt đơn.
                </p>
              ) : null}
              {D.shippingFee ? (
                D.freeShipFrom && cartTotal >= D.freeShipFrom ? (
                  <p className="pend">Miễn phí giao hàng cho đơn này.</p>
                ) : (
                  <p className="pend">
                    Phí giao hàng {fmt(D.shippingFee)} cộng khi gửi đơn.
                    {D.freeShipFrom ? ` Miễn phí giao từ ${fmt(D.freeShipFrom)}.` : ""}
                  </p>
                )
              ) : null}
              {D.orderNote ? <p className="pend">{D.orderNote}</p> : null}
              <label htmlFor="o-phone">Số điện thoại</label>
              <input className="f" id="o-phone" inputMode="tel" value={info.phone} onChange={(e) => setInfo("phone", e.target.value)} placeholder="+84 9xx xxx xxx" />
              <label htmlFor="o-addr">Địa chỉ nhận hàng</label>
              <input className="f" id="o-addr" value={info.addr || ""} onChange={(e) => setInfo("addr", e.target.value)} placeholder="Ví dụ: 66 Nguyễn Văn Công, Gò Vấp" />
              <label className="chk">
                <input type="checkbox" id="o-remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Lưu thông tin cho lần sau
              </label>
            </>
          ) : (
            <div className="empty">Chưa có món nào. Bấm “Thêm vào đơn” ở món bạn thích nhé.</div>
          )}
        </div>
        {entries.length ? (
          <div className="sh-f">
            {msg ? <p className="msg">{msg}</p> : null}
            <button className="btn" id="send" disabled={sending} onClick={sendOrder}>
              {sending ? "Đang gửi…" : "Gửi đơn cho " + D.store}
            </button>
            <div className="row2">
              <button className="btn ghost" id="copy" onClick={() => copyText(orderText(), "Đã sao chép đơn hàng")}>
                Sao chép đơn
              </button>
              <button className="btn ghost" id="clear" onClick={clearCart}>
                Xoá đơn
              </button>
            </div>
            <p className="note">Đơn gửi xong {D.store} nhận ngay. Bạn xem hóa đơn và quét mã QR để thanh toán.</p>
          </div>
        ) : null}
      </aside>
    </>
  );
}

const done = (o: Order) => o.status === "confirmed";
const codeOf = (o: Order) => o.code;
const atOf = (o: Order) => new Date(o.createdAt);

export function OrdersSheet() {
  const { D, MY, myReady, showPaid, setShowPaid, setOverlay } = useStore();
  if (!D) return null;
  const ZALO = String(D.zalo || "").replace(/[^0-9]/g, "");
  const os = [...MY].sort((a, b) => +atOf(b) - +atOf(a));
  const open = (o: Order) => o.items.length && setOverlay({ type: "bill", o });
  const card = (o: Order) => {
    const click = o.items.length > 0;
    return (
      <div
        key={o.code}
        className={`oc ${done(o) ? "done" : ""} ${o.paid ? "paid" : ""} ${click ? "oc-click" : ""}`}
        {...(click ? { role: "button", tabIndex: 0, "aria-label": `Xem hóa đơn đơn ${codeOf(o)}`, onClick: () => open(o), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && open(o) } : {})}
      >
        <div className="oc-code">Đơn #{codeOf(o)}</div>
        <div className="oc-h">
          <b>{o.name || o.phone || "Khách"}</b>
          <span>{o.name ? o.phone : ""}</span>
        </div>
        {o.product ? <p className="oc-n">🛍️ {o.product}</p> : null}
        {o.addr ? <p className="oc-n">📍 {o.addr}</p> : null}
        <small>{atOf(o).toLocaleString("vi-VN")}</small>
        <ul>
          {o.items.map((i, k) => (
            <li key={k}>
              [{i.country}] {itemName(i)} × {nf(i.qty)} <em>{nf(i.price) ? fmt(nf(i.price) * nf(i.qty)) : "chờ báo giá"}</em>
            </li>
          ))}
        </ul>
        {o.photos.length ? (
          <>
            <span className="oc-tag">📷 Tìm hộ theo ảnh</span>
            <div className="oc-ph">
              {o.photos.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                  <img src={u} alt="Ảnh khách gửi" loading="lazy" />
                </a>
              ))}
            </div>
          </>
        ) : null}
        {o.note ? <p className="oc-n">📝 {o.note}</p> : null}
        <div className="oc-f">
          <b>{fmt(nf(o.total))}</b>
          <span className={`oc-st ${done(o) || o.paid ? "ok" : ""}`}>{done(o) ? "Đã xử lý" : o.paid ? "Đã báo CK" : "Đang xử lý"}</span>
        </div>
        {click ? (
          <div className="oc-go">
            {!done(o) && !o.paid && nf(o.total) > 0 ? "💳 Xem hóa đơn & mã QR thanh toán" : "🧾 Xem hóa đơn"}
            <span aria-hidden="true">›</span>
          </div>
        ) : null}
      </div>
    );
  };
  const pend = os.filter((o) => !o.paid && !done(o)),
    pd = os.filter((o) => o.paid || done(o));
  return (
    <>
      <Bg />
      <aside className="sheet" role="dialog" aria-label="Đơn của bạn">
        <Head title="ĐƠN CỦA BẠN" />
        <div className="sh-b">
          {os.length ? (
            <>
              <p className="lock">
                🔒 Đơn đã gửi không thể chỉnh sửa. Muốn thay đổi, bạn nhắn Zalo cho {D.store}
                {ZALO ? (
                  <>
                    {" "}
                    (
                    <a href={`https://zalo.me/${ZALO}`} target="_blank" rel="noopener">
                      {ZALO}
                    </a>
                    )
                  </>
                ) : null}{" "}
                nhé.
              </p>
              {pend.length ? pend.map(card) : <div className="empty" style={{ padding: "18px 0" }}>Không có đơn nào chờ thanh toán ♡</div>}
              {pd.length ? (
                <>
                  <button className="more-paid" aria-expanded={showPaid} onClick={() => setShowPaid(!showPaid)}>
                    {showPaid ? "Ẩn" : "Xem thêm"} {pd.length} đơn đã chuyển khoản / đã xử lý <span aria-hidden="true">{showPaid ? "▴" : "▾"}</span>
                  </button>
                  {showPaid ? (
                    <div className="oc-minis">
                      {pd.map((o) => (
                        <div
                          key={o.code}
                          className="oc-mini"
                          {...(o.items.length ? { role: "button", tabIndex: 0, onClick: () => open(o), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && open(o) } : {})}
                          aria-label={`Xem hóa đơn ${codeOf(o)}`}
                        >
                          <b>#{codeOf(o)}</b>
                          <span>{atOf(o).toLocaleDateString("vi-VN")}</span>
                          <strong>{fmt(nf(o.total))}</strong>
                          <em>{o.paid ? "Đã CK" : "Đã xử lý"}</em>
                          <i aria-hidden="true">›</i>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <div className="empty">
              {myReady ? "Bạn chưa gửi đơn nào. Đơn bạn gửi sẽ hiện ở đây." : `Máy này chưa xem được đơn. Bạn liên hệ ${D.store} qua Zalo hoặc Messenger nhé.`}
            </div>
          )}
        </div>
        {ZALO ? (
          <div className="sh-f">
            <a className="btn zbtn" href={`https://zalo.me/${ZALO}`} target="_blank" rel="noopener">
              Nhắn Zalo để thay đổi đơn
            </a>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export function PhotoSheet() {
  const { D, phFiles, addPhotos, removePhoto, phName, setPhName, phSending, phMsg, sendPhoto } = useStore();
  if (!D) return null;
  return (
    <>
      <Bg />
      <aside className="sheet" role="dialog" aria-label="Nhu cầu của bạn">
        <Head title="NHU CẦU CỦA BẠN" />
        <div className="sh-b">
          <p className="note" style={{ margin: "0 0 12px" }}>
            Bạn thấy món nào ở Nhật, Hàn, Úc, Trung mà trang chưa có? Gửi ảnh cho {D.store}, shop sẽ tìm và báo giá cho bạn.
          </p>
          <label className="drop">
            <b>📷</b>Chọn ảnh sản phẩm<span>Ảnh chụp màn hình hoặc ảnh chụp sản phẩm · tối đa 6 ảnh</span>
            <input
              type="file"
              id="ph-file"
              accept="image/*"
              multiple
              onChange={(e) => {
                addPhotos([...(e.target.files || [])].filter((f) => /^image\//.test(f.type)));
                e.target.value = "";
              }}
            />
          </label>
          {phFiles.length ? (
            <div className="thumbs">
              {phFiles.map((f, i) => (
                <div key={f.url}>
                  <img src={f.url} alt={`Ảnh ${i + 1}`} />
                  <button onClick={() => removePhoto(i)} aria-label={`Bỏ ảnh ${i + 1}`}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <label htmlFor="ph-name">Tên sản phẩm</label>
          <input className="f" id="ph-name" value={phName} onChange={(e) => setPhName(e.target.value)} placeholder="Ví dụ: Giày Onitsuka Tiger Mexico 66, size 38" />
        </div>
        <div className="sh-f">
          {phMsg ? <p className="msg">{phMsg}</p> : null}
          <button className="btn" id="ph-send" disabled={phSending || !phFiles.length} onClick={sendPhoto}>
            {phSending ? "Đang gửi ảnh…" : phFiles.length ? "Gửi " + phFiles.length + " ảnh cho " + D.store : "Chọn ảnh để gửi"}
          </button>
          <p className="note">{D.store} sẽ nhắn bạn báo giá sau khi tìm được hàng.</p>
        </div>
      </aside>
    </>
  );
}
