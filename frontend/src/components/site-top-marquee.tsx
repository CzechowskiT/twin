"use client";

import { usePathname } from "next/navigation";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";

/** Home only: full-width logo strip above global header (top of page). */
export function SiteTopMarquee() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <CompanyLogoMarquee />;
}
