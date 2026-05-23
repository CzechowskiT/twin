"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { useMarketingPersona } from "@/components/persona-provider";
import { clearToken, getToken } from "@/lib/auth";
import {
  type GrowthCtaVariant,
  headerAccountLinks,
  headerGrowthLinksForPersona,
  showCandidateProductNav,
} from "@/lib/persona-access";

function growthCtaClass(variant: GrowthCtaVariant, base: string): string {
  if (variant === "candidate") return `${base} twin-header-cta--roi twin-nav-roi-pill`;
  if (variant === "company") return `${base} twin-header-cta--waitlist twin-nav-waitlist-pill`;
  if (variant === "investor") return `${base} twin-header-cta--roi twin-nav-roi-pill`;
  return `${base} twin-header-cta--waitlist twin-nav-waitlist-pill`;
}

type SiteHeaderBarProps = {
  /** Persona switcher is only for authenticated app chrome — never on public marketing. */
  showPersonaSwitcher: boolean;
};

/** Shared top bar: logo, corporate nav, account actions, optional persona switcher. */
export function SiteHeaderBar({ showPersonaSwitcher }: SiteHeaderBarProps) {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [hasSession, setHasSession] = useState(false);
  const growthLinks = headerGrowthLinksForPersona(persona, pathname, hasSession);
  const showCandidateNav = showCandidateProductNav(persona);
  const accountLinks = headerAccountLinks(persona, hasSession);
  const calendarActive = pathname === "/dashboard/calendar" || pathname.startsWith("/dashboard/calendar/");
  const dashboardSectionActive =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/calendar"));

  useEffect(() => {
    const sync = () => setHasSession(Boolean(getToken()));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  const closeMobileMenu = () => {
    const d = mobileMenuRef.current;
    if (d) d.open = false;
  };

  const corporateNavPrimary = [
    { href: "/about" as const, label: t("nav.about") },
    { href: "/how-it-works" as const, label: t("nav.howItWorks") },
    { href: "/pricing" as const, label: t("nav.pricing") },
    { href: "/case-studies" as const, label: t("nav.cases") },
    { href: "/faq" as const, label: t("nav.faq") },
    { href: "/contact" as const, label: t("nav.contact") },
  ];
  const corporateNavMore = [
    { href: "/partners" as const, label: t("nav.partners") },
    { href: "/media" as const, label: t("nav.media") },
    { href: "/careers" as const, label: t("nav.careers") },
  ];

  const headerCtaBase = "twin-header-cta twin-touch-target";
  const calendarClassName = `${headerCtaBase} twin-header-cta--ghost twin-header-cta--calendar`;
  const linkClass = "twin-nav-link whitespace-nowrap";
  const accountOutlineClass =
    "twin-touch-target inline-grid shrink-0 place-items-center whitespace-nowrap rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-0 text-[11px] font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] sm:px-3 sm:text-[12px]";
  const dashboardActiveClass =
    "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]";

  const logout = () => {
    clearToken();
    closeMobileMenu();
    router.push("/login");
  };

  const primaryGrowth = growthLinks[0];

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex flex-wrap items-center gap-x-3 gap-y-2 py-3 lg:gap-x-4 lg:py-3.5">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="twin-logo shrink-0">
            TWIN<span className="twin-logo-accent">.</span>
          </Link>
          {primaryGrowth ? (
            <Link
              href={primaryGrowth.href}
              className={`${growthCtaClass(primaryGrowth.variant, headerCtaBase)} hidden sm:inline-flex`}
            >
              {t(primaryGrowth.labelKey)}
            </Link>
          ) : null}
        </div>

        <nav
          className="order-3 hidden min-w-0 flex-1 basis-full flex-nowrap items-center justify-center gap-x-3 overflow-x-auto overscroll-x-contain text-[12px] font-medium [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-4 sm:text-[13px] md:order-none md:flex md:basis-auto lg:gap-x-5 lg:text-sm [&::-webkit-scrollbar]:hidden"
          aria-label={t("nav.ariaSiteNav")}
        >
          {corporateNavPrimary.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
          <span className="hidden text-[var(--twin-muted)] lg:inline" aria-hidden>
            ·
          </span>
          {corporateNavMore.map((item) => (
            <Link key={item.href} href={item.href} className={`${linkClass} hidden lg:inline`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {showCandidateNav && hasSession ? (
            <Link
              href="/dashboard/calendar"
              className={`${calendarClassName} hidden md:inline-flex ${calendarActive ? "twin-header-cta--active" : ""}`}
              aria-current={calendarActive ? "page" : undefined}
            >
              {t("dashboard.calendarLink")}
            </Link>
          ) : null}
          {accountLinks.map((item) =>
            item.isLogout ? (
              <button
                key="logout"
                type="button"
                onClick={logout}
                className={`${accountOutlineClass} hidden cursor-pointer md:inline-grid`}
              >
                {t(item.labelKey)}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`${accountOutlineClass} hidden md:inline-grid ${
                  item.href === "/dashboard" && dashboardSectionActive ? dashboardActiveClass : ""
                }`}
                aria-current={item.href === "/dashboard" && dashboardSectionActive ? "page" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
          {showPersonaSwitcher && hasSession ? <PersonaSwitcher /> : null}
          <LanguageSwitcher />
          <details ref={mobileMenuRef} className="relative md:hidden">
            <summary className="twin-touch-target flex cursor-pointer list-none items-center justify-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
              {t("nav.menu")}
            </summary>
            <nav
              className="absolute right-0 z-20 max-h-[min(70vh,28rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-2 shadow-lg"
              aria-label={t("nav.ariaMobileNav")}
              style={{ boxShadow: "var(--twin-shadow-md)" }}
            >
              {primaryGrowth ? (
                <Link
                  href={primaryGrowth.href}
                  onClick={closeMobileMenu}
                  className={`${growthCtaClass(primaryGrowth.variant, headerCtaBase)} mb-2 w-full`}
                >
                  {t(primaryGrowth.labelKey)}
                </Link>
              ) : null}
              {showCandidateNav && hasSession ? (
                <>
                  <Link
                    href="/dashboard/calendar"
                    onClick={closeMobileMenu}
                    className={`${calendarClassName} mb-2 w-full ${calendarActive ? "twin-header-cta--active" : ""}`}
                    aria-current={calendarActive ? "page" : undefined}
                  >
                    {t("dashboard.calendarLink")}
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={closeMobileMenu}
                    className={`twin-touch-target mb-2 grid w-full place-items-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-sm font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] ${dashboardSectionActive ? dashboardActiveClass : ""}`}
                    aria-current={dashboardSectionActive ? "page" : undefined}
                  >
                    {t("nav.dashboard")}
                  </Link>
                </>
              ) : null}
              <p className="mt-1 border-t border-[var(--twin-border)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("site.footerCompany")}
              </p>
              {[...corporateNavPrimary, ...corporateNavMore].map((item) => (
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
              {accountLinks.map((item) =>
                item.isLogout ? (
                  <button
                    key="logout-m"
                    type="button"
                    onClick={logout}
                    className="twin-touch-target mt-1 grid w-full cursor-pointer place-items-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-sm font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)]"
                  >
                    {t("dashboard.logout")}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="twin-touch-target twin-nav-link block rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                  >
                    {t(item.labelKey)}
                  </Link>
                ),
              )}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
