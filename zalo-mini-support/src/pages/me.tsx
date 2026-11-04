import { Avatar, Button, Header, Page, Text } from "zmp-ui";
import { Tabs } from "@/components/tabs";
import { useDesk } from "@/state";

export default function MePage() {
  const { me, loading, error, reload } = useDesk();
  return (
    <Page>
      <Header title="Tài khoản" showBackIcon={false} />
      <div className="screen">
        {loading ? <Text>Đang kiểm tra quyền…</Text> : null}
        {error ? <Text>{error}</Text> : null}
        {me ? (
          <>
            <Avatar src={me.avatar || undefined} size={64} />
            <Text bold>{me.name || "Nhân viên"}</Text>
            <Text size="small">{me.role === "support" ? "Customer support" : "Chưa có quyền chăm sóc"}</Text>
          </>
        ) : null}
        {me && me.role !== "support" && !error ? (
          <Text>Admin gán quyền customer support cho tài khoản Zalo này trong Báo cáo. Sau đó bấm tải lại.</Text>
        ) : null}
        <Text size="small">Mini App dùng cùng ứng dụng Zalo với trang bán hàng, nên user id của khách mở được cuộc chat.</Text>
        <Button variant="secondary" fullWidth onClick={reload}>
          Tải lại
        </Button>
      </div>
      <Tabs tab="me" />
    </Page>
  );
}
