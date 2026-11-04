"use client";

import HomePage from "@/shop/home";
import { StoreProvider } from "@/state/store";

export default function Page() {
  return (
    <StoreProvider>
      <HomePage />
    </StoreProvider>
  );
}
