import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Public marketing routes worth indexing (auth/dashboard excluded in robots.txt). */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/waitlist",
    "/first-1000",
    "/beta",
    "/for-candidates",
    "/for-recruiters",
    "/for-companies",
    "/demo",
    "/about",
    "/faq",
    "/contact",
    "/calculator",
    "/privacy",
    "/terms",
    "/status",
    "/developers",
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "/waitlist" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/waitlist" ? 0.95 : 0.7,
  }));
}
