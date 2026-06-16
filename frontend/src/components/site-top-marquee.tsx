"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { PerformanceSafeBrandStrip } from "@/components/marketing/performance-safe-brand-strip";
import { isPerformanceLightChromePath } from "@/lib/performance-route-classification";

const CompanyLogoMarquee = dynamic(
  () => import("@/components/marketing/company-logo-marquee").then((m) => m.CompanyLogoMarquee),
  {
    ssr: false,
    loading: () => (
      <div className="company-logo-marquee h-12 animate-pulse border-y border-[var(--twin-border)] bg-[var(--twin-surface)]" />
    ),
  },
);

/** Full-width company marks above global header — light strip on workspace/auth routes. */
export function SiteTopMarquee() {
  const pathname = usePathname() ?? "/";
  const lightChrome = isPerformanceLightChromePath(pathname);

  return (
    <div className="site-top-marquee-band relative z-[45] w-full shrink-0">
      {lightChrome ? <PerformanceSafeBrandStrip /> : <CompanyLogoMarquee />}
    </div>
  );
}
