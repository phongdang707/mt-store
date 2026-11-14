import { Suspense } from "react";
import FacebookCallback from "@/shop/facebook-callback";
import { Welcome } from "@/shop/welcome";

export default function Page() {
  return (
    <Suspense fallback={<Welcome waiting />}>
      <FacebookCallback />
    </Suspense>
  );
}
