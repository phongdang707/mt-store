import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, desk as loadDesk, me as loadMe, orders as loadOrders } from "@/services/api";
import type { Desk, Me, OrderBook } from "@/types";

interface DeskState {
  me: Me | null;
  desk: Desk | null;
  book: OrderBook | null;
  bookError: string;
  loading: boolean;
  error: string;
  reload: () => void;
  noteSent: (code: string) => void;
}

const DeskContext = createContext<DeskState | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [desk, setDesk] = useState<Desk | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [bookError, setBookError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    setError("");
    setBookError("");
    loadMe()
      .then(async (who) => {
        if (stop) return;
        setMe(who);
        if (who.role !== "support") {
          setDesk(null);
          setBook(null);
          return;
        }
        const [nextDesk, nextBook] = await Promise.all([
          loadDesk(),
          loadOrders().catch((e: unknown) => {
            if (!stop) setBookError(ordersFailure(e));
            return null;
          }),
        ]);
        if (stop) return;
        setDesk(nextDesk);
        setBook(nextBook);
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
    setBook((cur) =>
      cur ? { ...cur, orders: cur.orders.map((row) => (row.code === code ? { ...row, invoiceStatus: "sent" } : row)) } : cur,
    );
  }, []);

  const value = useMemo(
    () => ({ me, desk, book, bookError, loading, error, reload, noteSent }),
    [me, desk, book, bookError, loading, error, reload, noteSent],
  );
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("DeskProvider");
  return ctx;
}

/** Danh sách đơn lỗi riêng, các tab hoá đơn vẫn chạy. 404 nghĩa là server chưa có bản mới. */
function ordersFailure(e: unknown) {
  if (e instanceof ApiError && e.status === 404) return "Server chưa có mục đơn hàng. Cần deploy bản server mới.";
  return e instanceof Error ? e.message : "Chưa tải được danh sách đơn";
}
