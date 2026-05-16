"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";

function IconApple({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function IconGooglePlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 3.993v16.014c0 .548.445.993.993.993h16.014a.994.994 0 0 0 .993-.993V3.993A.995.995 0 0 0 20.007 3H3.993A.995.995 0 0 0 3 3.993ZM10 16.5v-9l7 4.5-7 4.5Z" />
    </svg>
  );
}

const pillBase =
  "twin-touch-target inline-flex min-h-[2.75rem] max-w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold leading-snug transition sm:min-w-[11rem]";

function StorePill({
  href,
  icon,
  label,
  soonTitle,
}: {
  href: string | undefined;
  icon: ReactNode;
  label: string;
  soonTitle: string;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${pillBase} border-[var(--twin-border)] bg-[var(--twin-card)] text-[var(--foreground)] shadow-sm hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]`}
      >
        <span className="shrink-0 text-[var(--twin-muted-strong)]">{icon}</span>
        <span className="min-w-0">{label}</span>
      </a>
    );
  }
  return (
    <span
      title={soonTitle}
      className={`${pillBase} cursor-not-allowed border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 text-[var(--twin-muted)]`}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="min-w-0">{label}</span>
    </span>
  );
}

/**
 * App Store + Google Play entry points. Set `NEXT_PUBLIC_APP_STORE_URL` and
 * `NEXT_PUBLIC_GOOGLE_PLAY_URL` when listings are live; otherwise pills show as disabled placeholders.
 */
export function StoreDownloadLinks() {
  const { t } = useTranslation();
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || undefined;
  const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL?.trim() || undefined;

  return (
    <div className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)]/60 px-5 py-5 sm:px-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("site.footerMobileTitle")}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted)]">{t("site.footerMobileLead")}</p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
        <StorePill
          href={appStoreUrl}
          icon={<IconApple className="h-6 w-6" />}
          label={t("site.footerMobileAppStore")}
          soonTitle={t("site.footerMobileSoonHint")}
        />
        <StorePill
          href={googlePlayUrl}
          icon={<IconGooglePlay className="h-6 w-6" />}
          label={t("site.footerMobileGooglePlay")}
          soonTitle={t("site.footerMobileSoonHint")}
        />
      </div>
    </div>
  );
}
