"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCookieConsent } from "@/components/cookie-consent-provider";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import { optionalAnalyticsConfigured } from "@/lib/analytics";
import {
  COOKIE_CONSENT_CLEARED_EVENT,
  hasDecidedCookieConsent,
  shouldShowCookieBannerOnPath,
} from "@/lib/cookie-consent";
import type { TranslationKey } from "@/lib/i18n";

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { acceptAll, rejectNonEssential } = useCookieConsent();
  const [visible, setVisible] = useState<boolean | null>(null);
  const analyticsConfigured = useMemo(() => optionalAnalyticsConfigured(), []);
  const bodyKey: TranslationKey = analyticsConfigured ? "cookie.bodyWithAnalytics" : "cookie.body";

  useEffect(() => {
    queueMicrotask(() => {
      const onPath = shouldShowCookieBannerOnPath(pathname);
      setVisible(onPath && !hasDecidedCookieConsent());
    });
  }, [pathname]);

  useEffect(() => {
    const onCleared = () => {
      queueMicrotask(() => {
        if (shouldShowCookieBannerOnPath(pathname)) setVisible(true);
      });
    };
    window.addEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) {
      root.dataset.cookieBanner = "open";
    } else {
      delete root.dataset.cookieBanner;
    }
    return () => {
      delete root.dataset.cookieBanner;
    };
  }, [visible]);

  if (visible === null || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
      aria-label={t("cookie.ariaRegion")}
    >
      <div className="cookie-consent-banner-panel twin-container mx-auto max-w-3xl rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card-solid)] p-4 shadow-lg sm:p-5">
        <p id="cookie-consent-title" className="text-sm font-semibold text-[var(--foreground)]">
          {t("cookie.title")}
        </p>
        <p id="cookie-consent-body" className="mt-2 text-sm leading-relaxed text-[var(--twin-muted)]">
          {t(bodyKey)}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              type="button"
              className="sm:!w-auto"
              onClick={() => {
                acceptAll();
                setVisible(false);
              }}
            >
              {t("cookie.accept")}
            </Button>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target w-full rounded px-4 py-2.5 text-sm font-semibold sm:!w-auto"
              onClick={() => {
                rejectNonEssential();
                setVisible(false);
              }}
            >
              {t("cookie.reject")}
            </button>
          </div>
          <Link href="/privacy" className="twin-link text-center text-sm font-medium sm:text-left">
            {t("cookie.privacy")}
          </Link>
        </div>
      </div>
    </div>
  );
}
