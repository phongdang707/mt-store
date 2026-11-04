import "zmp-ui/zaui.css";
import "@/css/app.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { configAppView } from "zmp-sdk";
import appConfig from "../app-config.json";
import MiniApp from "@/components/app";

if (!window.APP_CONFIG) window.APP_CONFIG = appConfig;

const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
void configAppView({
  headerTextColor: "black",
  statusBarType: "transparent",
  actionBar: { hide: true },
}).catch((error: unknown) => {
  if (local) return;
  throw error;
});

const root = document.getElementById("app");
if (!root) throw new Error("Thiếu #app");
createRoot(root).render(React.createElement(MiniApp));
