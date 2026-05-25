import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // API proxy: `src/app/api/v1/[[...path]]/route.ts` (reliable on Vercel + standalone).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.simpleicons.org", pathname: "/**" },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/npm/simple-icons@*/icons/**",
      },
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/**" },
      { protocol: "https", hostname: "t0.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "t1.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "t2.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "t3.gstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "icons.duckduckgo.com", pathname: "/**" },
      { protocol: "https", hostname: "www.capitalone.com", pathname: "/favicon.ico" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
