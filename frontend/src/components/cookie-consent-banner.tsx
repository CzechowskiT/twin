"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import {
  COOKIE_CONSENT_CLEARED_EVENT,
  hasCookieConsentDecision,
  writeCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setVisible(!hasCookieConsentDecision());
    });
  }, []);

  useEffect(() => {
    const onCleared = () => {
      queueMicrotask(() => setVisible(true));
    };
    window.addEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(COOKIE_CONSENT_CLEARED_EVENT, onCleared);
  }, []);

  if (visible === null || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="region"
      aria-label={t("cookies.ariaRegion")}
    >
      <div className="twin-container mx-auto max-w-3xl rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card-solid)] p-4 shadow-lg sm:p-5">
        <p className="text-sm font-semibold text-[var(--foreground)]">{t("cookies.bannerTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted)]">{t("cookies.bannerBody")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              type="button"
              className="sm:!w-auto"
              onClick={() => {
                writeCookieConsent({ analytics: true, marketing: true });
                setVisible(false);
              }}
            >
              {t("cookies.acceptAll")}
            </Button>
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target w-full rounded px-4 py-2.5 text-sm font-semibold sm:!w-auto"
              onClick={() => {
                writeCookieConsent({ analytics: false, marketing: false });
                setVisible(false);
              }}
            >
              {t("cookies.essentialOnly")}
            </button>
          </div>
          <Link href="/privacy#cookies" className="twin-link text-center text-sm font-medium sm:text-left">
            {t("site.footerPrivacy")}
          </Link>
        </div>
      </div>
    </div>
  );
}
