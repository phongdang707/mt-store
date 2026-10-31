import react from "@vitejs/plugin-react";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Chế độ dữ liệu mẫu (VITE_FIXTURE=1): phục vụ server/seed (catalog.json + ảnh) ở /__seed, chỉ khi chạy dev. */
function seedAssets(): Plugin {
  const root = fileURLToPath(new URL("../server/seed", import.meta.url));
  const types: Record<string, string> = { ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
  return {
    name: "seed-assets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__seed", (req, res, next) => {
        const rel = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^([/\\])+/, "");
        const file = join(root, rel);
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("content-type", types[extname(file).toLowerCase()] || "application/octet-stream");
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), seedAssets()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
