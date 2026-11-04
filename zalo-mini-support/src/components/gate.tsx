import type { ReactNode } from "react";
import { useDesk } from "@/state";

export function Hold({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="hold">
      <div className="gate">
        <p className="lead">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function Gate({ children }: { children: ReactNode }) {
  const { loading, error, me, reload } = useDesk();
  if (loading) return <Hold title="Đang kiểm tra quyền…" />;
  if (error) {
    return (
      <Hold title={error}>
        <button type="button" className="btn ghost" onClick={reload}>
          Thử lại
        </button>
      </Hold>
    );
  }
  if (me?.role !== "support") {
    return (
      <Hold title="Tài khoản này chưa được gán customer support.">
        <button type="button" className="btn ghost" onClick={reload}>
          Tải lại
        </button>
      </Hold>
    );
  }
  return children;
}
