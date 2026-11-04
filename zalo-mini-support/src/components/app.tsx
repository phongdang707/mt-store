import { useEffect } from "react";
import { App, AnimationRoutes, Route, SnackbarProvider, ZMPRouter, useNavigate } from "zmp-ui";
import BillPage from "@/pages/bill";
import BillsPage from "@/pages/bills";
import MePage from "@/pages/me";
import OrderPage from "@/pages/order";
import OrdersPage from "@/pages/orders";
import PeoplePage from "@/pages/people";
import { DeskProvider } from "@/state";

function Jump({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true, animate: false });
  }, [navigate, to]);
  return null;
}

export default function MiniApp() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <DeskProvider>
          <ZMPRouter>
            <AnimationRoutes>
              <Route path="/" element={<OrdersPage />} />
              <Route path="/order/:code" element={<OrderPage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/todo" element={<Jump to="/bills" />} />
              <Route path="/sent" element={<Jump to="/bills?view=sent" />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/bill/:code" element={<BillPage />} />
            </AnimationRoutes>
          </ZMPRouter>
        </DeskProvider>
      </SnackbarProvider>
    </App>
  );
}
