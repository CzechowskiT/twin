"use client";

import { usePathname } from "next/navigation";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";
import { PerformanceSafeBrandStrip } from "@/components/marketing/performance-safe-brand-strip";
import { isPerformanceLightChromePath } from "@/lib/performance-route-classification";

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
