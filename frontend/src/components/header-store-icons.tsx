"use client";

import { useTranslation } from "@/components/language-provider";

function IconApple({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.38c.843-1.012 1.4-2.427 1.245-3.38-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.748" />
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
          <IconApple className="h-5 w-5" />
        </a>
      ) : (
        <span className={`${iconWrap} cursor-not-allowed opacity-50`} title={soon} aria-label={t("site.headerAppStoreAria")}>
          <IconApple className="h-5 w-5" />
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
