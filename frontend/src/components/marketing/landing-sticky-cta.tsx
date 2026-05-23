"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";

/** Mobile-only sticky Register bar after scroll — does not block demo in hero. */
export function LandingStickyCta() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 380);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="landing-sticky-cta pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" role="region" aria-label={t("home.stickyCtaLabel")}>
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-3 border-t border-[var(--twin-border)] bg-[var(--twin-surface)]/95 px-4 py-3 shadow-[0_-12px_40px_-8px_rgb(0_0_0_/_0.25)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{t("home.stickyCtaLabel")}</p>
          <p className="truncate text-[11px] text-[var(--twin-muted)]">{t("home.stickyCtaMicro")}</p>
        </div>
        <Link
          href="/register"
          className="section-cta-primary marketing-btn-primary-shadow twin-touch-target shrink-0 !min-h-[2.5rem] px-5 text-sm"
        >
          {t("home.getStarted")}
        </Link>
      </div>
    </div>
  );
}
