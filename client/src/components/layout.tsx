import { App, AnimationRoutes, Route, SnackbarProvider, ZMPRouter } from "zmp-ui";
import HomePage from "@/pages/index";
import { StoreProvider } from "@/state/store";

export default function Layout() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <StoreProvider>
          <ZMPRouter>
            <AnimationRoutes>
              <Route path="/" element={<HomePage />} />
            </AnimationRoutes>
          </ZMPRouter>
        </StoreProvider>
      </SnackbarProvider>
    </App>
  );
}
