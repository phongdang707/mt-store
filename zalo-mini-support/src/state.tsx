import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { desk as loadDesk, me as loadMe } from "@/services/api";
import type { Desk, Me } from "@/types";

interface DeskState {
  me: Me | null;
  desk: Desk | null;
  loading: boolean;
  error: string;
  reload: () => void;
  noteSent: (code: string) => void;
}

const DeskContext = createContext<DeskState | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    setError("");
    loadMe()
      .then(async (who) => {
        if (stop) return;
        setMe(who);
        if (who.role !== "support") {
          setDesk(null);
          return;
        }
        setDesk(await loadDesk());
      })
      .catch((e: unknown) => {
        if (!stop) setError(e instanceof Error ? e.message : "Chưa tải được danh sách");
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const noteSent = useCallback((code: string) => {
    setDesk((cur) =>
      cur
        ? { ...cur, invoices: cur.invoices.map((row) => (row.code === code ? { ...row, invoiceStatus: "sent" } : row)) }
        : cur,
    );
  }, []);

  const value = useMemo(() => ({ me, desk, loading, error, reload, noteSent }), [me, desk, loading, error, reload, noteSent]);
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("DeskProvider");
  return ctx;
}
