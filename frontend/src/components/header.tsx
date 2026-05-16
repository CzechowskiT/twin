"use client";

import Link from "next/link";
import { useRef } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";

/** One chrome everywhere: calm light header (matches hope / growth palette in globals). */
export function Header() {
  const { t } = useTranslation();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  const closeMobileMenu = () => {
    const d = mobileMenuRef.current;
    if (d) d.open = false;
  };

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
    { href: "/login" as const, label: t("nav.login") },
    { href: "/register" as const, label: t("nav.register") },
    { href: "/profile" as const, label: t("nav.profile") },
    { href: "/dashboard" as const, label: t("nav.dashboard") },
  ];

  const roiClassName =
    "twin-nav-roi-pill twin-touch-target inline-flex max-w-[10.5rem] shrink-0 items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--twin-cta)] px-3 py-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-[0_4px_14px_rgb(217_119_6_/0.55)] ring-2 ring-white/90 ring-offset-2 ring-offset-white transition hover:bg-[var(--twin-cta-hover)] hover:shadow-[0_6px_20px_rgb(180_83_9_/0.5)] sm:max-w-[16rem] sm:px-5 sm:py-2.5 sm:text-[12px] sm:leading-snug md:text-[13px]";

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 sm:py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/" className="twin-logo shrink-0">
            TWIN<span className="twin-logo-accent">.</span>
          </Link>
          <Link href="/calculator" className={roiClassName}>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
            {t("nav.calculator")}
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
          <nav
            className="flex max-w-[56rem] flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[12px] font-medium sm:text-[13px]"
            aria-label={t("nav.ariaCompanyNav")}
          >
            {marketing.map((item) => (
              <Link key={item.href} href={item.href} className="twin-nav-link whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden h-6 w-px shrink-0 bg-[var(--twin-border)] sm:block" aria-hidden />
          <nav
            className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[12px] sm:text-[13px]"
            aria-label={t("nav.ariaAccountNav")}
          >
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
          <details ref={mobileMenuRef} className="relative">
            <summary className="twin-touch-target flex cursor-pointer list-none items-center justify-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
              {t("nav.menu")}
            </summary>
            <nav
              className="absolute right-0 z-20 max-h-[min(70vh,28rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-2 shadow-lg"
              aria-label={t("nav.ariaMobileNav")}
              style={{ boxShadow: "var(--twin-shadow-md)" }}
            >
              <Link
                href="/calculator"
                onClick={closeMobileMenu}
                className={`${roiClassName} mb-2 flex w-full justify-center`}
              >
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
                {t("nav.calculator")}
              </Link>
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("site.footerCompany")}
              </p>
              {marketing.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
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
                  onClick={closeMobileMenu}
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
