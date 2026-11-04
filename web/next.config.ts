import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  agentRules: false,
  // next dev đứng sau nginx của shop; không có dòng này thì trình duyệt bị chặn HMR và không hydrate.
  allowedDevOrigins: ["mt-store.store"],
};

export default nextConfig;
