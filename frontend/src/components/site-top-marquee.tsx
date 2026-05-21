"use client";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";

/** Full-width animated company marks above global header — same strip on every page (waitlist hides chrome in SiteChrome). */
export function SiteTopMarquee() {
  return (
    <div className="site-top-marquee-band relative z-[45] w-full shrink-0">
      <CompanyLogoMarquee />
    </div>
  );
}
