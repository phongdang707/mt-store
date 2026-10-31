import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "./app-state";
import Invoices from "./pages/invoices";
import Login from "./pages/login";
import Orders from "./pages/orders";
import Products from "./pages/products";
import PublicInvoice from "./pages/public-invoice";
import Requests from "./pages/requests";
import Settings from "./pages/settings";
import "./styles.css";

function Guard({ children }: { children: ReactNode }) {
  const { me, ready } = useApp();
  if (!ready) return null;
  return me ? <>{children}</> : <Login />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/hd/:token" element={<PublicInvoice />} />
        <Route
          path="*"
          element={
            <AppProvider>
              <Guard>
                <Routes>
                  <Route path="/" element={<Orders />} />
                  <Route path="/san-pham" element={<Products />} />
                  <Route path="/tim-ho" element={<Requests />} />
                  <Route path="/hoa-don" element={<Invoices />} />
                  <Route path="/cai-dat" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Guard>
            </AppProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
