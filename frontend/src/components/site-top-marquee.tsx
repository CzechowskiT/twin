"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { PerformanceSafeMovingLogoMarquee } from "@/components/marketing/performance-safe-moving-logo-marquee";
import { useTranslation } from "@/components/language-provider";
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

/** Full-width company marks above global header — route-aware marquee density. */
export function SiteTopMarquee() {
  const pathname = usePathname() ?? "";
  const lightChrome = isPerformanceLightChromePath(pathname);
  const { t } = useTranslation();

  return (
    <div className="site-top-marquee-band relative z-[45] w-full shrink-0">
      {lightChrome ? (
        <PerformanceSafeMovingLogoMarquee />
      ) : (
        <>
          <CompanyLogoMarquee />
          <p
            className="border-b border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/95 px-4 py-1.5 text-center text-[10px] leading-relaxed text-[var(--twin-muted)] sm:text-[11px]"
            data-testid="marquee-logo-disclaimer"
          >
            {t("site.marqueeLogoDisclaimer")}
          </p>
        </>
      )}
    </div>
  );
}
