"use client";

import dynamic from "next/dynamic";

const CompanyLogoMarquee = dynamic(
  () => import("@/components/marketing/company-logo-marquee").then((m) => m.CompanyLogoMarquee),
  {
    ssr: false,
    loading: () => (
      <div className="company-logo-marquee h-12 animate-pulse border-y border-[var(--twin-border)] bg-[var(--twin-surface)]" />
    ),
  },
);

/** Full-width company marks above global header — scrolling marquee on all routes. */
export function SiteTopMarquee() {
  return (
    <div className="site-top-marquee-band relative z-[45] w-full shrink-0">
      <CompanyLogoMarquee />
    </div>
  );
}
