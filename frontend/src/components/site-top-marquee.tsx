"use client";

import { usePathname } from "next/navigation";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";

/** Public marketing paths: same infinite logo strip as on the home page (before it was narrowed to `/` only). */
const MARQUEE_EXACT = new Set([
  "/",
  "/about",
  "/partners",
  "/demo",
  "/faq",
  "/media",
  "/careers",
  "/contact",
  "/case-studies",
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
]);

function showMarqueeForPath(pathname: string | null): boolean {
  const p = pathname ?? "";
  if (MARQUEE_EXACT.has(p)) return true;
  if (p === "/calculator" || p.startsWith("/calculator/")) return true;
  return false;
}

/** Full-width animated company marks above global header (stacked over fixed background). */
export function SiteTopMarquee() {
  const pathname = usePathname();
  if (!showMarqueeForPath(pathname)) return null;
  return (
    <div className="site-top-marquee-band relative z-[45] w-full shrink-0">
      <CompanyLogoMarquee />
    </div>
  );
}
