import { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "@/app-state";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { H1, Search, Segmented } from "@/components/ui";
import { timeOf } from "@/format";
import { sx } from "@/sx";
import type { AppLog, AppLogDetail, LogLevel, LogSource } from "@/types";

const CARD = "background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10)";
const MUTED = "font-size: 13px; color: #7d6862";
const LEVEL: Record<LogLevel, string> = { error: "Lỗi", warn: "Cảnh báo", info: "Thông tin" };
const SOURCE: Record<LogSource, string> = { http: "HTTP", webhook: "Webhook", zalo: "Zalo", app: "App" };
const CHIP: Record<LogLevel, string> = {
  error: "background: #f8d6d8; color: #8d2430",
  warn: "background: #fdecc8; color: #7a4f00",
  info: "background: #f6e1dc; color: #8f4459",
};
const LEVELS: ["", ...LogLevel[]] = ["", "error", "warn", "info"];
const SOURCES: ["", ...LogSource[]] = ["", "http", "webhook", "zalo", "app"];

function Detail({ id }: { id: string }) {
  const [d, setD] = useState<AppLogDetail | null>(null);
  useEffect(() => {
    let stop = false;
    setD(null);
    api
      .log(id)
      .then((row) => {
        if (!stop) setD(row);
      })
      .catch((e) => toast((e as Error).message));
    return () => {
      stop = true;
    };
  }, [id]);
  if (!d) return <p style={sx("margin: 0 0 12px; " + MUTED)}>Đang tải chi tiết…</p>;
  const meta = Object.entries(d.meta || {});
  return (
    <div style={sx("margin: 0 0 12px; display: flex; flex-direction: column; gap: 8px")}>
      {meta.length ? (
        <div style={sx("display: flex; flex-direction: column; gap: 4px; font-size: 13px")}>
          {meta.map(([k, v]) => (
            <span key={k}>
              <b>{k}</b>: {String(v)}
            </span>
          ))}
        </div>
      ) : null}
      {d.stack ? (
        <pre style={sx("margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 240px; overflow: auto; background: #ffffff; border: 1px solid #efd9d3; border-radius: 12px; padding: 10px 12px; font-size: 12px; line-height: 1.45")}>{d.stack}</pre>
      ) : null}
      {!meta.length && !d.stack ? <p style={sx("margin: 0; " + MUTED)}>Không có chi tiết thêm.</p> : null}
    </div>
  );
}

export default function Logs() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AppLog[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let stop = false;
    setErr("");
    setItems(null);
    setOpen(null);
    api
      .logs({ level: level || undefined, source: source || undefined, q: query || undefined, limit: "50" })
      .then((page) => {
        if (stop) return;
        setItems(page.items);
        setNext(page.next);
      })
      .catch((e) => {
        if (!stop) setErr((e as Error).message);
      });
    return () => {
      stop = true;
    };
  }, [level, source, query, reload]);

  const more = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const page = await api.logs({ level: level || undefined, source: source || undefined, q: query || undefined, before: next, limit: "50" });
      setItems((cur) => [...(cur || []), ...page.items]);
      setNext(page.next);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell variant="scroll">
      <main className="main-pad" style={sx(MAIN.scroll)}>
        <MobileHead title="Nhật ký" sub="Lỗi API, webhook, Zalo" />
        <div className="only-desktop" style={sx("display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px")}>
          <H1>Nhật ký</H1>
          <Search label="Tìm nhật ký" placeholder="Tìm lời nhắn hoặc đường dẫn…" value={q} onChange={setQ} />
        </div>
        <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 10px")}>
          <Segmented label="Mức" items={LEVELS.map((id) => [id, id ? LEVEL[id] : "Tất cả"])} value={level} onPick={setLevel} />
          <Segmented label="Nguồn" items={SOURCES.map((id) => [id, id ? SOURCE[id] : "Mọi nguồn"])} value={source} onPick={setSource} />
          <button onClick={() => setReload((n) => n + 1)} style={sx("border: 1px solid #efd9d3; background: #fffaf7; color: #8f4459; border-radius: 999px; padding: 8px 14px; font-weight: 700")}>
            Làm mới
          </button>
          <span className="only-mobile" style={sx("flex: 1 1 180px")}>
            <Search label="Tìm nhật ký" placeholder="Tìm lời nhắn…" value={q} onChange={setQ} flex="1 1 auto" minWidth="0" />
          </span>
        </div>
        {err ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>{err}</p>
        ) : !items ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>Đang tải nhật ký…</p>
        ) : (
          <section style={sx(CARD + "; padding: 8px 18px 14px")}>
            {items.length ? (
              items.map((row) => (
                <div key={row.id}>
                  <button
                    onClick={() => setOpen((cur) => (cur === row.id ? null : row.id))}
                    aria-expanded={open === row.id}
                    style={sx("width: 100%; text-align: left; border: 0; background: transparent; padding: 12px 0; border-bottom: 1px dashed #efd9d3; display: flex; flex-direction: column; gap: 4px")}
                  >
                    <span style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 8px")}>
                      <span style={sx("font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; " + CHIP[row.level])}>{LEVEL[row.level]}</span>
                      <span style={sx(MUTED)}>{SOURCE[row.source]}</span>
                      {row.status ? <b style={sx("font-size: 13px")}>{row.status}</b> : null}
                      <span style={{ flex: 1 }}></span>
                      <span style={sx(MUTED)}>{timeOf(row.at)}</span>
                    </span>
                    <span style={sx("font-weight: 600; font-size: 14.5px")}>{row.message}</span>
                    {row.method || row.path ? <span style={sx(MUTED)}>{[row.method, row.path].filter(Boolean).join(" ")}</span> : null}
                  </button>
                  {open === row.id ? <Detail id={row.id} /> : null}
                </div>
              ))
            ) : (
              <p style={sx("margin: 0; padding: 28px 8px; text-align: center; " + MUTED)}>Chưa có nhật ký trong bộ lọc này.</p>
            )}
            {next ? (
              <button
                onClick={more}
                disabled={busy}
                style={sx("margin-top: 12px; border: 1px solid #efd9d3; background: #fffaf7; color: #8f4459; border-radius: 999px; padding: 8px 14px; font-weight: 700" + (busy ? "; opacity: 0.6" : ""))}
              >
                {busy ? "Đang tải…" : "Tải thêm"}
              </button>
            ) : null}
          </section>
        )}
      </main>
    </Shell>
  );
}
