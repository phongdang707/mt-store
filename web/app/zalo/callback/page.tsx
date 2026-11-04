import { Suspense } from "react";
import ZaloCallback from "@/shop/zalo-callback";
import { Welcome } from "@/shop/welcome";

export default function Page() {
  return (
    <Suspense fallback={<Welcome waiting />}>
      <ZaloCallback />
    </Suspense>
  );
}
