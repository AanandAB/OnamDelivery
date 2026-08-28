import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → deploy the `out/` directory to Cloudflare Pages.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
