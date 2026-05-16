import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // API proxy: `src/app/api/v1/[[...path]]/route.ts` (reliable on Vercel + standalone).
};

export default nextConfig;
