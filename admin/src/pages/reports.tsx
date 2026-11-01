import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { toast } from "@/app-state";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { Avatar, BlockCustomer, CHIP, CloseX, ContactPills, H1, Search, Segmented } from "@/components/ui";
import { ago, duration, norm, timeOf } from "@/format";
import { sx } from "@/sx";
import type { Analytics, AnalyticsUserDetail } from "@/types";

const DAYS = [7, 30, 90] as const;
const PLATFORM: Record<string, string> = { ios: "iOS", android: "Android", web: "Web" };
const platformOf = (p: string) => PLATFORM[p] || p || "Không rõ";
const pct = (n: number) => Math.round((n || 0) * 100) + "%";
const dayLabel = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const machine = (model: string, platform: string) => [model, platformOf(platform)].filter((s) => s && s !== "Không rõ").join(" · ") || "Chưa rõ máy";
const labelOf = (u: { zaloName?: string; name?: string }) => u.zaloName || u.name || "Khách";

const CARD = "background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10)";
const H2 = "margin: 0; font-family: Quicksand, sans-serif; font-weight: 700; font-size: 18px; color: #3d3530";
const MUTED = "font-size: 13px; color: #7d6862";

function Bars({ rows, value }: { rows: { label: string; n: number; hint?: string }[]; value: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.n), 1);
  if (!rows.length) return <p style={sx("margin: 0; " + MUTED)}>Chưa có số liệu trong khoảng này.</p>;
  return (
    <div style={sx("display: flex; flex-direction: column; gap: 10px")}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={sx("display: flex; justify-content: space-between; gap: 8px; font-size: 13.5px; margin-bottom: 4px")}>
            <span style={sx("font-weight: 600")}>{r.label}</span>
            <span style={sx("color: #7d6862")}>{value(r.n)}{r.hint ? " · " + r.hint : ""}</span>
          </div>
          <div style={sx("height: 8px; border-radius: 999px; background: #f6e1dc")}>
            <div style={sx("height: 8px; border-radius: 999px; background: #b3566f; width: " + Math.round((r.n / max) * 100) + "%")}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ id, days, onClose, onDeleted, onBlocked }: { id: string; days: number; onClose: () => void; onDeleted: () => void; onBlocked: (id: string, blocked: boolean) => void }) {
  const [d, setD] = useState<AnalyticsUserDetail | null>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let stop = false;
    setD(null);
    api
      .analyticsUser(id, days)
      .then((x) => {
        if (!stop) setD(x);
      })
      .catch((e) => toast((e as Error).message));
    return () => {
      stop = true;
    };
  }, [id, days]);
  const u = d?.user;
  const remove = async () => {
    if (!u || busy) return;
    if (!sure) return setSure(true);
    setBusy(true);
    try {
      await api.deleteUser(id);
      toast(`Đã xoá “${labelOf(u)}”`);
      onDeleted();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
      setSure(false);
    }
  };
  return (
    <section aria-label="Chi tiết người dùng" className="detail-sheet" style={sx("flex: 1 1 380px; max-width: 460px; min-width: 0; " + CARD + "; display: flex; flex-direction: column")}>
      <div style={sx("padding: 18px 20px 14px; border-bottom: 1px solid #efd9d3; display: flex; flex-direction: column; gap: 8px")}>
        <div style={sx("display: flex; align-items: center; gap: 10px")}>
          <span style={sx("font-weight: 800; color: #a3546a; letter-spacing: 0.4px")}>NGƯỜI DÙNG</span>
          <span style={{ flex: 1 }}></span>
          <CloseX onClick={onClose} label="Đóng chi tiết" />
        </div>
        {u ? (
          <>
            <div style={sx("display: flex; align-items: center; gap: 12px")}>
              <Avatar src={u.avatar} name={labelOf(u)} size={56} font={20} />
              <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column")}>
                <span style={sx("display: flex; align-items: center; gap: 8px; flex-wrap: wrap")}>
                  <b style={sx("font-family: Quicksand, sans-serif; font-size: 20px")}>{labelOf(u)}</b>
                  {u.blocked ? <span style={sx(CHIP.chan)}>Đã chặn</span> : null}
                </span>
                <span style={sx(MUTED)}>{machine(u.model, u.platform)}{u.zaloVersion ? " · Zalo " + u.zaloVersion : ""}</span>
              </span>
            </div>
            {u.zaloName && u.name && u.name !== u.zaloName ? <span style={sx(MUTED)}>Tên đặt hàng: {u.name}</span> : null}
            <ContactPills phone={u.phone} />
            <BlockCustomer id={u.id} blocked={u.blocked} onChange={(blocked) => {
              setD((cur) => (cur ? { ...cur, user: { ...cur.user, blocked } } : cur));
              onBlocked(u.id, blocked);
            }} />
            <span style={sx(MUTED)}>
              {u.visitCount} lần vào · lần cuối {u.lastSeenAt ? ago(u.lastSeenAt) : "—"} · gặp từ {timeOf(u.createdAt)}
            </span>
            <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px")}>
              <button
                onClick={remove}
                onBlur={() => setSure(false)}
                disabled={busy}
                style={sx(
                  "border: 0; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; " +
                    (sure ? "background: #c0392b; color: #ffffff; border-radius: 999px; padding: 8px 14px" : "background: transparent; color: #8f4459; padding: 6px 2px") +
                    (busy ? "; opacity: 0.6" : ""),
                )}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16"></path>
                  <path d="M9 7V4h6v3"></path>
                  <path d="M6 7l1 13h10l1-13"></path>
                </svg>
                {busy ? "Đang xoá…" : sure ? "Bấm lần nữa để xoá" : "Xoá khỏi app"}
              </button>
              {sure ? <span style={sx(MUTED)}>Xoá hồ sơ và lịch sử xem. Đơn trong trang quản lý vẫn giữ. Họ mở app lại sẽ là người dùng mới.</span> : null}
            </div>
          </>
        ) : (
          <p style={sx("margin: 0; " + MUTED)}>Đang tải…</p>
        )}
      </div>
      {d ? (
        <div style={sx("padding: 8px 20px 18px; display: flex; flex-direction: column; gap: 16px")}>
          <div>
            <h3 style={sx(H2 + "; font-size: 16px; margin-bottom: 8px")}>Theo ngày trong {d.days} ngày</h3>
            {d.activity.length ? (
              d.activity.map((row) => (
                <div key={row.date} style={sx("display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px dashed #efd9d3; font-size: 14px")}>
                  <span>{dayLabel(row.date)} · {row.visits} lần</span>
                  <b style={sx("color: #a3546a")}>{duration(row.durationSec)}</b>
                </div>
              ))
            ) : (
              <p style={sx("margin: 0; " + MUTED)}>Chưa mở app trong khoảng này.</p>
            )}
          </div>
          <div>
            <h3 style={sx(H2 + "; font-size: 16px; margin-bottom: 8px")}>Sản phẩm đã xem · {d.orders} đơn</h3>
            {d.products.length ? (
              d.products.map((p) => (
                <div key={p.id} style={sx("display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #efd9d3")}>
                  {p.img ? <img src={p.img} alt="" style={sx("width: 36px; height: 36px; flex: 0 0 36px; border-radius: 8px; object-fit: contain; background: #ffffff; border: 1px solid #efd9d3")} /> : <span style={sx("width: 36px; height: 36px; flex: 0 0 36px; border-radius: 8px; background: #f6e1dc")}></span>}
                  <span style={sx("flex: 1; min-width: 0; font-weight: 600; font-size: 14px")}>{p.name}</span>
                  <span style={sx("font-size: 12.5px; color: #7d6862; text-align: right")}>{p.views} xem · {p.opens} mở · {p.carts} giỏ</span>
                </div>
              ))
            ) : (
              <p style={sx("margin: 0; " + MUTED)}>Chưa xem sản phẩm nào trong khoảng này.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function Reports() {
  const [days, setDays] = useState<(typeof DAYS)[number]>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let stop = false;
    setErr("");
    api
      .analytics(days)
      .then((d) => {
        if (!stop) setData(d);
      })
      .catch((e) => {
        if (!stop) setErr((e as Error).message);
      });
    return () => {
      stop = true;
    };
  }, [days, reload]);

  const users = useMemo(() => {
    const n = norm(q);
    if (!data) return [];
    if (!n) return data.users;
    return data.users.filter((u) => norm(u.zaloName + " " + u.name + " " + u.phone + " " + u.model + " " + platformOf(u.platform)).includes(n));
  }, [data, q]);

  const s = data?.summary;
  const stats: [string, string][] = s
    ? [
        ["Người dùng", String(s.activeUsers)],
        ["Người mới", String(s.newUsers)],
        ["Lượt mở app", String(s.visits)],
        ["Thời gian dùng", duration(s.durationSec)],
        ["TB mỗi phiên", duration(s.avgSessionSec)],
        ["TB mỗi người", duration(s.avgUserSec)],
        ["Lượt xem", String(s.views)],
        ["Mở chi tiết", String(s.opens)],
        ["Thêm giỏ", String(s.carts)],
        ["Đơn hàng", String(s.orders)],
      ]
    : [];
  const maxVisits = Math.max(...(data?.daily.map((d) => d.visits) ?? [1]), 1);

  return (
    <Shell variant="scroll">
      <main className="main-pad" style={sx(MAIN.scroll)}>
        <MobileHead title="Báo cáo" sub={s ? s.activeUsers + " người dùng" : "Đang tải…"} />
        <div className="only-desktop" style={sx("display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px")}>
          <H1>Báo cáo</H1>
          <Search label="Tìm người dùng" placeholder="Tìm tên, máy, số điện thoại…" value={q} onChange={setQ} />
        </div>
        <div style={sx("display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px")}>
          <Segmented label="Khoảng thời gian" items={DAYS.map((d) => [d, d + " ngày"])} value={days} onPick={setDays} />
          <span className="only-mobile" style={sx("flex: 1 1 180px")}>
            <Search label="Tìm người dùng" placeholder="Tìm tên, máy…" value={q} onChange={setQ} flex="1 1 auto" minWidth="0" />
          </span>
        </div>

        {err ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>{err}</p>
        ) : !data || !s ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>Đang tải báo cáo…</p>
        ) : (
          <>
            <div style={sx("display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 12px")}>
              {stats.map(([label, value]) => (
                <div key={label} style={sx(CARD + "; border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px")}>
                  <span style={sx("font-size: 12.5px; font-weight: 600; color: #6f5a55")}>{label}</span>
                  <b style={sx("font-size: 20px; line-height: 1.2; color: #3d3530")}>{value}</b>
                </div>
              ))}
            </div>
            <p style={sx("margin: 0; " + MUTED)}>
              Xem sản phẩm {pct(data.rates.view)} người vào · Thêm giỏ {pct(data.rates.cart)} người xem · Đặt hàng {pct(data.rates.order)} người vào
            </p>

            <div style={sx("display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch")}>
              <section style={sx("flex: 1 1 260px; " + CARD + "; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px")}>
                <h2 style={sx(H2)}>Nền tảng</h2>
                <Bars rows={data.platforms.map((p) => ({ label: platformOf(p.platform), n: p.users }))} value={(n) => n + " người"} />
              </section>
              <section style={sx("flex: 2 1 360px; min-width: 0; " + CARD + "; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px")}>
                <h2 style={sx(H2)}>Xu hướng</h2>
                <div style={sx("display: flex; align-items: flex-end; gap: 3px; height: 120px; overflow-x: auto")}>
                  {data.daily.map((d) => (
                    <div key={d.date} title={dayLabel(d.date) + " · " + d.visits + " lượt · " + duration(d.durationSec) + " · " + d.views + " xem"} style={sx("flex: 1 0 14px; min-width: 14px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center")}>
                      <div style={sx("width: 8px; border-radius: 999px 999px 2px 2px; background: #b3566f; height: " + Math.max(d.visits ? 4 : 0, Math.round((d.visits / maxVisits) * 100)) + "%")}></div>
                    </div>
                  ))}
                </div>
                <span style={sx(MUTED)}>Mỗi cột là một ngày: lượt mở app. Giữ một cột để xem thời gian dùng và lượt xem.</span>
              </section>
            </div>

            <section style={sx(CARD + "; padding: 8px 8px 12px")}>
              <h2 style={sx(H2 + "; padding: 12px 12px 8px")}>Sản phẩm xem nhiều nhất</h2>
              {data.products.length ? (
                data.products.map((p) => (
                  <div key={p.id} style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 10px 12px; border-radius: 14px")}>
                    {p.img ? <img src={p.img} alt="" style={sx("width: 40px; height: 40px; flex: 0 0 40px; border-radius: 10px; object-fit: contain; background: #ffffff; border: 1px solid #efd9d3")} /> : <span style={sx("width: 40px; height: 40px; flex: 0 0 40px; border-radius: 10px; background: #f6e1dc; color: #8f4459; display: flex; align-items: center; justify-content: center; font-weight: 700")}>{(p.name || "?").charAt(0)}</span>}
                    <span style={sx("flex: 1 1 180px; min-width: 0; font-weight: 600")}>{p.name}</span>
                    <span style={sx("display: flex; flex-wrap: wrap; gap: 6px")}>
                      <span style={sx("background: #b3566f; color: #ffffff; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700")}>{p.views} xem</span>
                      <span style={sx("background: #f6e1dc; color: #8f4459; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700")}>{p.viewers} người</span>
                      <span style={sx("color: #7d6862; font-size: 12.5px; font-weight: 600")}>{p.opens} mở · {p.carts} giỏ · {p.orders} đơn</span>
                    </span>
                  </div>
                ))
              ) : (
                <p style={sx("margin: 0; padding: 28px 12px; text-align: center; color: #7d6862")}>Chưa có lượt xem nào trong khoảng này.</p>
              )}
            </section>

            <div style={sx("display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start")}>
              <section aria-label="Danh sách người dùng" style={sx("flex: 999 1 460px; min-width: 0; display: flex; flex-direction: column; gap: 12px")}>
                <h2 style={sx(H2)}>
                  Người dùng <span style={sx("font-family: 'Be Vietnam Pro', sans-serif; font-size: 13.5px; font-weight: 600; color: #7d6862")}>· {users.length}</span>
                </h2>
                <div style={sx(CARD + "; padding: 8px; display: flex; flex-direction: column; gap: 4px")}>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      className={u.id === sel ? undefined : "row-btn"}
                      onClick={() => setSel(u.id === sel ? null : u.id)}
                      style={sx(
                        "box-sizing: border-box; display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border-radius: 16px; font: inherit; color: inherit; text-align: left; " +
                          (u.id === sel ? "background: #fbe7ec; border: 1.5px solid #b3566f" : "background: transparent; border: 1.5px solid transparent"),
                      )}
                    >
                      <Avatar src={u.avatar} name={labelOf(u)} size={44} />
                      <span style={sx("flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px")}>
                        <span style={sx("display: flex; align-items: center; gap: 8px; min-width: 0")}>
                          <b style={sx("font-size: 15px")}>{labelOf(u)}</b>
                          {u.blocked ? <span style={sx(CHIP.chan)}>Đã chặn</span> : null}
                        </span>
                        <span style={sx("font-size: 13.5px; color: #7d6862; overflow: hidden; text-overflow: ellipsis; white-space: nowrap")}>
                          {machine(u.model, u.platform)}
                          {u.products.length ? " · " + u.products.map((p) => p.name).join(", ") : ""}
                        </span>
                      </span>
                      <span style={sx("display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex: 0 0 auto")}>
                        <b style={sx("font-size: 14px; color: #a3546a")}>{duration(u.durationSec)}</b>
                        <span style={sx("font-size: 12.5px; color: #7d6862")}>{u.visits} lần · {u.lastSeenAt ? ago(u.lastSeenAt) : ""}</span>
                      </span>
                    </button>
                  ))}
                  {!users.length ? <p style={sx("margin: 0; padding: 40px 16px; text-align: center; color: #7d6862")}>{q ? "Không có người dùng nào khớp." : "Chưa có người dùng nào trong khoảng này."}</p> : null}
                </div>
              </section>
              {sel ? (
                <Detail
                  key={sel + days}
                  id={sel}
                  days={days}
                  onClose={() => setSel(null)}
                  onDeleted={() => {
                    const id = sel;
                    setSel(null);
                    setData((cur) => (cur ? { ...cur, users: cur.users.filter((u) => u.id !== id) } : cur));
                    setReload((n) => n + 1);
                  }}
                  onBlocked={(id, blocked) => setData((cur) => (cur ? { ...cur, users: cur.users.map((u) => (u.id === id ? { ...u, blocked } : u)) } : cur))}
                />
              ) : null}
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}
