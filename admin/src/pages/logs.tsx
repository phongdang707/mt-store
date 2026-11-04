import { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "@/app-state";
import { MAIN, MobileHead, Shell } from "@/components/shell";
import { H1, Search, Segmented } from "@/components/ui";
import { timeOf } from "@/format";
import { sx } from "@/sx";
import type { AppLog, AppLogDetail, LogLevel, LogReportGroup, LogSource } from "@/types";

const CARD = "background: #fffaf7; border: 1px solid #efd9d3; border-radius: 22px; box-shadow: 0 6px 18px rgba(150, 90, 100, 0.10)";
const MUTED = "font-size: 13px; color: #7d6862";
const LINK = MUTED + "; border: 0; background: transparent; padding: 0; font-weight: 700; color: #8f4459";
const LEVEL: Record<LogLevel, string> = { error: "Lỗi", warn: "Cảnh báo", info: "Thông tin" };
const SOURCE: Record<LogSource, string> = { http: "HTTP", webhook: "Webhook", zalo: "Zalo", app: "App" };
const CHIP: Record<LogLevel, string> = {
  error: "background: #f8d6d8; color: #8d2430",
  warn: "background: #fdecc8; color: #7a4f00",
  info: "background: #f6e1dc; color: #8f4459",
};
const LEVELS: ["", ...LogLevel[]] = ["", "error", "warn", "info"];
const SOURCES: ["", ...LogSource[]] = ["", "http", "webhook", "zalo", "app"];
const VIEWS = [
  ["lines", "Dòng"],
  ["report", "Báo lỗi"],
] as ["lines" | "report", string][];

type Trace = { kind: "actor" | "rid" | "fingerprint"; value: string; label: string };

function Detail({ id, onActor, onRid }: { id: string; onActor: (actor: string) => void; onRid: (rid: string) => void }) {
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
  const notes = d.notes || [];
  const meta = Object.entries(d.meta || {});
  const hasContext = Boolean(d.rid || d.actor || typeof d.ms === "number");
  const empty = !hasContext && !notes.length && !d.stack && !meta.length;
  return (
    <div style={sx("margin: 0 0 12px; display: flex; flex-direction: column; gap: 8px")}>
      {hasContext ? (
        <div style={sx("display: flex; flex-wrap: wrap; gap: 10px; align-items: center")}>
          {d.actor ? (
            <button onClick={() => onActor(d.actor || "")} style={sx(LINK)}>
              {d.actor}
            </button>
          ) : null}
          {d.rid ? (
            <button onClick={() => onRid(d.rid || "")} style={sx(LINK)}>
              {d.rid}
            </button>
          ) : null}
          {typeof d.ms === "number" ? <span style={sx(MUTED)}>{d.ms} ms</span> : null}
        </div>
      ) : null}
      {notes.length ? (
        <div style={sx("display: flex; flex-direction: column; gap: 4px; font-size: 13px")}>
          {notes.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      ) : null}
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
      {empty ? <p style={sx("margin: 0; " + MUTED)}>Không có chi tiết thêm.</p> : null}
    </div>
  );
}

export default function Logs() {
  const [view, setView] = useState<(typeof VIEWS)[number][0]>("lines");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [trace, setTrace] = useState<Trace | null>(null);
  const [items, setItems] = useState<AppLog[] | null>(null);
  const [groups, setGroups] = useState<LogReportGroup[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const filters = {
    level: level || undefined,
    source: source || undefined,
    q: query || undefined,
    actor: trace?.kind === "actor" ? trace.value : undefined,
    rid: trace?.kind === "rid" ? trace.value : undefined,
    fingerprint: trace?.kind === "fingerprint" ? trace.value : undefined,
    limit: "50",
  };

  useEffect(() => {
    if (view !== "lines") return;
    let stop = false;
    setErr("");
    setItems(null);
    setOpen(null);
    api
      .logs({
        level: level || undefined,
        source: source || undefined,
        q: query || undefined,
        actor: trace?.kind === "actor" ? trace.value : undefined,
        rid: trace?.kind === "rid" ? trace.value : undefined,
        fingerprint: trace?.kind === "fingerprint" ? trace.value : undefined,
        limit: "50",
      })
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
  }, [view, level, source, query, reload, trace]);

  useEffect(() => {
    if (view !== "report") return;
    let stop = false;
    setErr("");
    setGroups(null);
    api
      .logReport()
      .then((page) => {
        if (!stop) setGroups(page.items);
      })
      .catch((e) => {
        if (!stop) setErr((e as Error).message);
      });
    return () => {
      stop = true;
    };
  }, [view, reload]);

  const pick = (kind: Trace["kind"], value: string, label: string) => {
    setView("lines");
    setTrace({ kind, value, label });
  };

  const more = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const page = await api.logs({ ...filters, before: next });
      setItems((cur) => [...(cur || []), ...page.items]);
      setNext(page.next);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const traceName = trace ? (trace.kind === "actor" ? "Người" : trace.kind === "rid" ? "Mã" : "Nhóm lỗi") : "";

  return (
    <Shell variant="scroll">
      <main className="main-pad" style={sx(MAIN.scroll)}>
        <MobileHead title="Nhật ký" sub="Request, lỗi, người gọi" />
        <div className="only-desktop" style={sx("display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px")}>
          <H1>Nhật ký</H1>
          <Search label="Tìm nhật ký" placeholder="Tìm lời nhắn, đường dẫn, người…" value={q} onChange={setQ} />
        </div>
        <div style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 10px")}>
          <Segmented label="Xem" items={VIEWS} value={view} onPick={setView} />
          {view === "lines" ? (
            <>
              <Segmented label="Mức" items={LEVELS.map((id) => [id, id ? LEVEL[id] : "Tất cả"])} value={level} onPick={setLevel} />
              <Segmented label="Nguồn" items={SOURCES.map((id) => [id, id ? SOURCE[id] : "Mọi nguồn"])} value={source} onPick={setSource} />
            </>
          ) : null}
          <button onClick={() => setReload((n) => n + 1)} style={sx("border: 1px solid #efd9d3; background: #fffaf7; color: #8f4459; border-radius: 999px; padding: 8px 14px; font-weight: 700")}>
            Làm mới
          </button>
          {trace ? (
            <button onClick={() => setTrace(null)} style={sx("border: 1px solid #efd9d3; background: #fffaf7; color: #8f4459; border-radius: 999px; padding: 8px 14px; font-weight: 700")}>
              {traceName}: {trace.label} · Bỏ
            </button>
          ) : null}
          <span className="only-mobile" style={sx("flex: 1 1 180px")}>
            <Search label="Tìm nhật ký" placeholder="Tìm lời nhắn, người…" value={q} onChange={setQ} flex="1 1 auto" minWidth="0" />
          </span>
        </div>
        {err ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>{err}</p>
        ) : view === "report" ? (
          !groups ? (
            <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>Đang tải báo lỗi…</p>
          ) : (
            <section style={sx(CARD + "; padding: 8px 18px 14px")}>
              {groups.length ? (
                groups.map((group) => (
                  <button
                    key={group.fingerprint}
                    onClick={() => pick("fingerprint", group.fingerprint, group.message)}
                    style={sx("width: 100%; text-align: left; border: 0; background: transparent; padding: 12px 0; border-bottom: 1px dashed #efd9d3; display: flex; flex-direction: column; gap: 4px")}
                  >
                    <span style={sx("display: flex; flex-wrap: wrap; align-items: center; gap: 8px")}>
                      <span style={sx("font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; " + CHIP[group.level])}>{group.count} lần</span>
                      <span style={sx("font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; " + CHIP[group.level])}>{LEVEL[group.level]}</span>
                      {group.status ? <b style={sx("font-size: 13px")}>{group.status}</b> : null}
                      <span style={{ flex: 1 }}></span>
                      <span style={sx(MUTED)}>{timeOf(group.lastAt)}</span>
                    </span>
                    <span style={sx("font-weight: 600; font-size: 14.5px")}>{group.message}</span>
                    {group.path ? <span style={sx(MUTED)}>{group.path}</span> : null}
                  </button>
                ))
              ) : (
                <p style={sx("margin: 0; padding: 28px 8px; text-align: center; " + MUTED)}>Chưa có lỗi trong 7 ngày qua.</p>
              )}
            </section>
          )
        ) : !items ? (
          <p style={sx("margin: 0; padding: 28px 8px; text-align: center; color: #7d6862")}>Đang tải nhật ký…</p>
        ) : (
          <section style={sx(CARD + "; padding: 8px 18px 14px")}>
            {items.length ? (
              items.map((row) => (
                <div key={row.id}>
                  <div style={sx("padding: 12px 0 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px")}>
                    <span style={sx("font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 10px; " + CHIP[row.level])}>{LEVEL[row.level]}</span>
                    <span style={sx(MUTED)}>{SOURCE[row.source]}</span>
                    {row.status ? <b style={sx("font-size: 13px")}>{row.status}</b> : null}
                    {typeof row.ms === "number" ? <span style={sx(MUTED)}>{row.ms} ms</span> : null}
                    {row.actor ? (
                      <button onClick={() => pick("actor", row.actor || "", row.actor || "")} style={sx(LINK)}>
                        {row.actor}
                      </button>
                    ) : null}
                    {row.rid ? (
                      <button onClick={() => pick("rid", row.rid || "", row.rid || "")} style={sx(LINK)}>
                        {row.rid}
                      </button>
                    ) : null}
                    <span style={{ flex: 1 }}></span>
                    <span style={sx(MUTED)}>{timeOf(row.at)}</span>
                  </div>
                  <button
                    onClick={() => setOpen((cur) => (cur === row.id ? null : row.id))}
                    aria-expanded={open === row.id}
                    style={sx("width: 100%; text-align: left; border: 0; background: transparent; padding: 4px 0 12px; border-bottom: 1px dashed #efd9d3; display: flex; flex-direction: column; gap: 4px")}
                  >
                    <span style={sx("font-weight: 600; font-size: 14.5px")}>{row.message}</span>
                    {row.method || row.path ? <span style={sx(MUTED)}>{[row.method, row.path].filter(Boolean).join(" ")}</span> : null}
                  </button>
                  {open === row.id ? <Detail id={row.id} onActor={(actor) => pick("actor", actor, actor)} onRid={(rid) => pick("rid", rid, rid)} /> : null}
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
