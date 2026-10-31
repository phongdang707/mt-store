import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { configAppView } from "zmp-sdk";
import "zmp-ui/zaui.css";
import "./css/storefront.css";
import Layout from "./components/layout";
import { inZalo } from "./services/api";
import { installLinkHandler } from "./services/share";

if (inZalo) document.documentElement.classList.add("in-zalo");
if (/android/i.test(navigator.userAgent)) document.documentElement.classList.add("is-android");
installLinkHandler();

// Giao diện theo sáng/tối của máy (như trang gốc) → chữ thanh trạng thái đổi màu theo.
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const applyAppView = () =>
  configAppView({
    headerTextColor: darkMQ.matches ? "white" : "black",
    statusBarType: "transparent",
    actionBar: { hide: true },
  }).catch((err) => {
    // Ngoài Zalo (localhost) lệnh này luôn lỗi, bỏ qua.
    if (inZalo) console.error("configAppView", err);
  });
applyAppView();
darkMQ.addEventListener?.("change", applyAppView);

createRoot(document.getElementById("app")!).render(createElement(Layout));
