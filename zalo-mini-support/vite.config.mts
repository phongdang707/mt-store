import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";

export default defineConfig({
  base: "",
  plugins: [zaloMiniApp(), react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    host: "0.0.0.0",
    port: 2999,
    strictPort: true,
  },
});
