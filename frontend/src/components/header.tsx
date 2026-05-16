"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";

/** One chrome everywhere: calm light header (matches hope / growth palette in globals). */
export function Header() {
  const { t } = useTranslation();

  const marketing = [
    { href: "/about" as const, label: t("nav.about") },
    { href: "/case-studies" as const, label: t("nav.cases") },
    { href: "/faq" as const, label: t("nav.faq") },
    { href: "/partners" as const, label: t("nav.partners") },
    { href: "/media" as const, label: t("nav.media") },
    { href: "/careers" as const, label: t("nav.careers") },
    { href: "/contact" as const, label: t("nav.contact") },
  ];

  const app = [
    { href: "/calculator" as const, label: t("nav.calculator") },
    { href: "/login" as const, label: t("nav.login") },
    { href: "/register" as const, label: t("nav.register") },
    { href: "/profile" as const, label: t("nav.profile") },
    { href: "/dashboard" as const, label: t("nav.dashboard") },
  ];

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 sm:py-3.5">
        <Link href="/" className="twin-logo shrink-0">
          TWIN<span className="twin-logo-accent">.</span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
          <nav
            className="flex max-w-[56rem] flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[12px] font-medium sm:text-[13px]"
            aria-label="Company"
          >
            {marketing.map((item) => (
              <Link key={item.href} href={item.href} className="twin-nav-link whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden h-6 w-px shrink-0 bg-[var(--twin-border)] sm:block" aria-hidden />
          <nav className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[12px] sm:text-[13px]" aria-label="Account">
            {app.map((item) => (
              <Link key={item.href} href={item.href} className="twin-nav-link whitespace-nowrap font-medium">
                {item.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <details className="relative">
            <summary className="twin-touch-target flex cursor-pointer list-none items-center justify-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
              {t("nav.menu")}
            </summary>
            <nav
              className="absolute right-0 z-20 max-h-[min(70vh,28rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-2 shadow-lg"
              aria-label="Main"
              style={{ boxShadow: "var(--twin-shadow-md)" }}
            >
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("site.footerCompany")}
              </p>
              {marketing.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="twin-touch-target twin-nav-link block rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                >
                  {item.label}
                </Link>
              ))}
              <p className="mt-2 border-t border-[var(--twin-border)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("site.footerExplore")}
              </p>
              {app.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="twin-touch-target twin-nav-link block rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
