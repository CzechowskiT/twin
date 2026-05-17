"use client";

import { useTranslation } from "@/components/language-provider";

/** Neutral handset glyph (no third-party logo) for the iOS store entry. */
function IconMobileHandset({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M12 17h.01" />
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

const iconWrap =
  "twin-touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] hover:text-[var(--foreground)]";

type HeaderStoreIconsProps = {
  /** When true, always show as a row (e.g. inside the mobile menu). */
  inline?: boolean;
};

/** Compact App Store / Google Play — header rail or mobile menu. */
export function HeaderStoreIcons({ inline = false }: HeaderStoreIconsProps) {
  const { t } = useTranslation();
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || undefined;
  const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL?.trim() || undefined;

  const soon = t("site.footerMobileSoonHint");

  return (
    <div
      className={`${inline ? "flex" : "hidden md:flex"} items-center gap-1`}
      role="group"
      aria-label={t("site.headerStoresAria")}
    >
      {appStoreUrl ? (
        <a
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={iconWrap}
          aria-label={t("site.headerAppStoreAria")}
        >
          <IconMobileHandset className="h-5 w-5" />
        </a>
      ) : (
        <span className={`${iconWrap} cursor-not-allowed opacity-50`} title={soon} aria-label={t("site.headerAppStoreAria")}>
          <IconMobileHandset className="h-5 w-5" />
        </span>
      )}
      {googlePlayUrl ? (
        <a
          href={googlePlayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={iconWrap}
          aria-label={t("site.headerGooglePlayAria")}
        >
          <IconGooglePlay className="h-5 w-5" />
        </a>
      ) : (
        <span className={`${iconWrap} cursor-not-allowed opacity-50`} title={soon} aria-label={t("site.headerGooglePlayAria")}>
          <IconGooglePlay className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
