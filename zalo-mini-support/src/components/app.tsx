import { App, AnimationRoutes, Route, SnackbarProvider, ZMPRouter } from "zmp-ui";
import BillPage from "@/pages/bill";
import MePage from "@/pages/me";
import PeoplePage from "@/pages/people";
import QueuePage from "@/pages/queue";
import { DeskProvider } from "@/state";

export default function MiniApp() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <DeskProvider>
          <ZMPRouter>
            <AnimationRoutes>
              <Route path="/" element={<QueuePage mode="todo" />} />
              <Route path="/sent" element={<QueuePage mode="sent" />} />
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
