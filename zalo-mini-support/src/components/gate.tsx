import type { ReactNode } from "react";
import { Button, Spinner, Text } from "zmp-ui";
import { useDesk } from "@/state";

export function Gate({ children }: { children: ReactNode }) {
  const { loading, error, me, reload } = useDesk();
  if (loading) return <Spinner />;
  if (error) {
    return (
      <>
        <Text>{error}</Text>
        <Button fullWidth onClick={reload}>
          Thử lại
        </Button>
      </>
    );
  }
  if (me?.role !== "support") {
    return <Text>Tài khoản này chưa được gán customer support. Admin gán quyền trong Báo cáo, rồi mở lại Mini App.</Text>;
  }
  return children;
}
