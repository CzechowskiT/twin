"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { useMarketingPersona } from "@/components/persona-provider";
import { clearToken, getToken } from "@/lib/auth";
import { headerGrowthLinksForPersona, showCandidateProductNav } from "@/lib/persona-access";

/** One chrome everywhere: calm light header (matches hope / growth palette in globals). */
export function Header() {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();
  const growthLinks = headerGrowthLinksForPersona(persona);
  const showCandidateNav = showCandidateProductNav(persona);
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [hasSession, setHasSession] = useState(false);
  const calendarActive = pathname === "/dashboard/calendar" || pathname.startsWith("/dashboard/calendar/");
  /** Main dashboard and subpages except calendar (calendar has its own green pill). */
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

  /** Account + app entry — profile lives in the dashboard panel, not global chrome. */
  const app = [
    { href: "/login" as const, label: t("nav.login") },
    { href: "/register" as const, label: t("nav.register") },
    ...(showCandidateNav ? [{ href: "/dashboard" as const, label: t("nav.dashboard") }] : []),
  ];

  const corporateNav = [
    { href: "/about" as const, label: t("nav.about") },
    { href: "/case-studies" as const, label: t("nav.cases") },
    { href: "/faq" as const, label: t("nav.faq") },
    { href: "/partners" as const, label: t("nav.partners") },
    { href: "/media" as const, label: t("nav.media") },
    { href: "/careers" as const, label: t("nav.careers") },
    { href: "/contact" as const, label: t("nav.contact") },
  ];

  const headerCtaBase = "twin-header-cta twin-touch-target";

  const roiClassName = `${headerCtaBase} twin-header-cta--roi twin-nav-roi-pill`;
  const waitlistClassName = `${headerCtaBase} twin-header-cta--waitlist twin-nav-waitlist-pill`;
  const demoClassName = `${headerCtaBase} twin-header-cta--ghost`;
  const calendarClassName = `${headerCtaBase} twin-header-cta--ghost twin-header-cta--calendar`;

  const linkClass = "twin-nav-link whitespace-nowrap";

  /** Outline “account” control — grid centers label the same on `<a>` and `<button>` inside `.twin-touch-target` min-height. */
  const accountOutlineDesktopClass =
    "twin-touch-target inline-grid shrink-0 place-items-center whitespace-nowrap rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-0 text-[11px] font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] sm:px-3 sm:text-[12px]";

  const dashboardDesktopActiveClass =
    "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]";

  const logout = () => {
    clearToken();
    closeMobileMenu();
    router.push("/login");
  };

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex max-md:flex-wrap max-md:items-center max-md:justify-between max-md:gap-x-3 max-md:gap-y-2 py-3 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-x-3 md:gap-y-2 md:py-3.5 lg:gap-x-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:flex-none lg:gap-4">
          <Link href="/" className="twin-logo shrink-0">
            TWIN<span className="twin-logo-accent">.</span>
          </Link>
          <div className="twin-header-growth hidden min-w-0 sm:block" aria-label={t("nav.ariaGrowthCta")}>
            <div className="twin-header-growth__pair">
              {growthLinks.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={i === 0 ? roiClassName : waitlistClassName}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <nav
          className="hidden min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 overflow-x-auto overscroll-x-contain text-[11px] font-medium [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-2.5 sm:text-[12px] md:flex md:justify-self-center md:px-1 lg:gap-x-3 lg:text-[13px] [&::-webkit-scrollbar]:hidden"
          aria-label={t("nav.ariaSiteNav")}
        >
          {corporateNav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-0 flex-col items-end gap-y-2 md:flex md:justify-self-end">
          <div
            className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1"
            role="group"
            aria-label={t("nav.ariaProductCta")}
          >
            <Link href="/demo" className={demoClassName}>
              {t("nav.demo")}
            </Link>
            {showCandidateNav ? (
              <Link
                href="/dashboard/calendar"
                className={`${calendarClassName} ${calendarActive ? "twin-header-cta--active" : ""}`}
                aria-current={calendarActive ? "page" : undefined}
              >
                {t("dashboard.calendarLink")}
              </Link>
            ) : null}
          </div>
          <nav
            className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[12px] sm:text-[13px]"
            aria-label={t("nav.ariaAccountNav")}
          >
            {hasSession && showCandidateNav ? (
              <>
                <Link
                  href="/dashboard"
                  className={`${accountOutlineDesktopClass} ${dashboardSectionActive ? dashboardDesktopActiveClass : ""}`}
                  aria-current={dashboardSectionActive ? "page" : undefined}
                >{t("nav.dashboard")}</Link>
                <button type="button" onClick={logout} className={`${accountOutlineDesktopClass} cursor-pointer`}>{t("dashboard.logout")}</button>
              </>
            ) : hasSession ? (
              <button type="button" onClick={logout} className={`${accountOutlineDesktopClass} cursor-pointer`}>{t("dashboard.logout")}</button>
            ) : (
              app.map((item) => (
                <Link key={item.href} href={item.href} className={`${linkClass} font-medium`}>
                  {item.label}
                </Link>
              ))
            )}
          </nav>
          <div className="flex w-full flex-wrap items-center justify-end gap-x-2 gap-y-1">
            <PersonaSwitcher />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex w-full basis-full flex-col items-stretch gap-y-2 border-t border-[var(--twin-border)]/60 py-2 md:hidden">
          <div className="flex items-center justify-end gap-2">
            <PersonaSwitcher />
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
                <div className="marketing-cta-stack mb-2">
                  {growthLinks.map((item, i) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`${i === 0 ? roiClassName : waitlistClassName} w-full`}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  <Link href="/demo" onClick={closeMobileMenu} className={`${demoClassName} w-full`}>
                    {t("nav.demo")}
                  </Link>
                  {showCandidateNav ? (
                    <Link
                      href="/dashboard/calendar"
                      onClick={closeMobileMenu}
                      className={`${calendarClassName} w-full ${calendarActive ? "twin-header-cta--active" : ""}`}
                      aria-current={calendarActive ? "page" : undefined}
                    >
                      {t("dashboard.calendarLink")}
                    </Link>
                  ) : null}
                  {hasSession && showCandidateNav ? (
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className={`twin-touch-target grid w-full place-items-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-sm font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] ${dashboardSectionActive ? "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]" : ""}`}
                      aria-current={dashboardSectionActive ? "page" : undefined}
                    >{t("nav.dashboard")}</Link>
                  ) : null}
                </div>
                <p className="mt-2 border-t border-[var(--twin-border)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                  {t("site.footerCompany")}
                </p>
                {corporateNav.map((item) => (
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
                {hasSession ? (
                  <button
                    type="button"
                    onClick={logout}
                    className="twin-touch-target mt-1 grid w-full cursor-pointer place-items-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-sm font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)]"
                  >{t("dashboard.logout")}</button>
                ) : (
                  app.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="twin-touch-target twin-nav-link block rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                    >
                      {item.label}
                    </Link>
                  ))
                )}
              </nav>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
