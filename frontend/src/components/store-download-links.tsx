"use client";

import type { ReactNode } from "react";

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
