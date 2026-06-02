import type { NextConfig } from "next";

/**
 * Narrowed report-only CSP for S2 burn-in (2026-06-01).
 * Host allowlists from `docs/S2_CSP_EXTERNAL_ORIGIN_INVENTORY_2026-06-01.md`.
 * Stays `Content-Security-Policy-Report-Only` — no enforce flip in this slice.
 * Prod keeps prior header until the next frontend deploy.
 */
const CSP_REPORT_ONLY =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob: https://images.unsplash.com https://cdn.simpleicons.org https://cdn.jsdelivr.net https://www.google.com https://t0.gstatic.com https://t1.gstatic.com https://t2.gstatic.com https://t3.gstatic.com https://icons.duckduckgo.com https://www.capitalone.com; " +
  "font-src 'self' data:; " +
  "connect-src 'self' https://twin-production-bcd9.up.railway.app https://plausible.io https://us.i.posthog.com; " +
  "frame-src https://www.youtube-nocookie.com; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "report-uri /api/v1/csp-report";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_REPORT_ONLY,
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
