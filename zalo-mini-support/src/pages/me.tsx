import { Page } from "zmp-ui";
import { Hold } from "@/components/gate";
import { BackBar, Face } from "@/components/shell";
import { useDesk } from "@/state";

export default function MePage() {
  const { me, loading, error, reload } = useDesk();
  return (
    <Page>
      <BackBar title="Tài khoản" />
      <div className="screen quiet">
        {loading && !me ? <Hold title="Đang kiểm tra quyền…" /> : null}
        {error ? (
          <Hold title={error}>
            <button type="button" className="btn ghost" onClick={reload}>
              Thử lại
            </button>
          </Hold>
        ) : null}
        {me && !error ? (
          <div className="hold">
            <div className="gate">
              <Face src={me.avatar} name={me.name} size={72} />
              <h2>{me.name || "Nhân viên"}</h2>
              <span className={"tag " + (me.role === "support" ? "ok" : "off")}>{me.role === "support" ? "Customer support" : "Chưa có quyền"}</span>
              {me.role !== "support" ? <p>Tài khoản này chưa được gán customer support.</p> : null}
              <button type="button" className="btn ghost" disabled={loading} onClick={reload}>
                {loading ? "Đang tải…" : "Tải lại"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Page>
  );
}
