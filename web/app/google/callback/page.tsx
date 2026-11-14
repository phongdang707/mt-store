import { Suspense } from "react";
import GoogleCallback from "@/shop/google-callback";
import { Welcome } from "@/shop/welcome";

export default function Page() {
  return (
    <Suspense fallback={<Welcome waiting />}>
      <GoogleCallback />
    </Suspense>
  );
}
