"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";
import { PersonaSwitcher } from "@/components/persona-switcher";
import { clearToken, getToken } from "@/lib/auth";

/** One chrome everywhere: calm light header (matches hope / growth palette in globals). */
export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
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
    { href: "/dashboard" as const, label: t("nav.dashboard") },
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

  const roiClassName =
    "twin-nav-roi-pill twin-touch-target inline-flex max-w-[10.5rem] shrink-0 items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--twin-cta)] px-3 py-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-[var(--twin-on-cta)] shadow-[0_4px_14px_rgb(217_119_6_/0.55)] ring-2 ring-white/90 ring-offset-2 ring-offset-white transition hover:bg-[var(--twin-cta-hover)] hover:shadow-[0_6px_20px_rgb(180_83_9_/0.5)] sm:max-w-[16rem] sm:px-5 sm:py-2.5 sm:text-[12px] sm:leading-snug md:text-[13px]";

  const demoClassName =
    "twin-nav-demo-pill twin-touch-target inline-flex max-w-[10.5rem] shrink-0 items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--twin-accent)] px-3 py-2 text-center text-[10px] font-extrabold uppercase leading-tight tracking-wide text-[var(--twin-on-accent)] shadow-[0_4px_14px_rgb(31_77_64_/0.45)] ring-2 ring-white/90 ring-offset-2 ring-offset-white transition hover:bg-[var(--twin-accent-hover)] hover:shadow-[0_6px_20px_rgb(22_56_46_/0.42)] sm:max-w-[16rem] sm:px-5 sm:py-2.5 sm:text-[12px] sm:leading-snug md:text-[13px]";

  /** Same chrome as Demo — primary nav pill for calendar. */
  const calendarNavPillClassName = demoClassName;

  const linkClass = "twin-nav-link whitespace-nowrap";

  /** Outline “account” control — matches Dashboard link and Log out (same flex box model as `.twin-touch-target` min-height). */
  const accountOutlineDesktopClass =
    "twin-touch-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-1 text-center text-[11px] font-semibold leading-none text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] sm:px-3 sm:py-1.5 sm:text-[12px]";

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
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-1 md:flex-none">
          <Link href="/" className="twin-logo shrink-0">
            TWIN<span className="twin-logo-accent">.</span>
          </Link>
          <div className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:gap-x-2">
            <Link href="/calculator" className={roiClassName}>
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
              {t("nav.calculator")}
            </Link>
            <Link href="/demo" className={demoClassName}>
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-sm" aria-hidden />
              {t("nav.demo")}
            </Link>
            <Link
              href="/dashboard/calendar"
              className={`${calendarNavPillClassName} ${calendarActive ? "ring-4 ring-white/95 ring-offset-2 ring-offset-[var(--twin-header-bg,var(--background))]" : ""}`}
              aria-current={calendarActive ? "page" : undefined}
            >
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-sm" aria-hidden />
              {t("dashboard.calendarLink")}
            </Link>
          </div>
        </div>

        <nav
          className="hidden min-w-0 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12px] font-medium sm:text-[13px] md:flex md:justify-self-center md:px-2"
          aria-label={t("nav.ariaSiteNav")}
        >
          {corporateNav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-0 flex-col items-end gap-y-2 md:flex md:justify-self-end">
          <nav
            className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[12px] sm:text-[13px]"
            aria-label={t("nav.ariaAccountNav")}
          >
            {hasSession ? (
              <>
                <Link
                  href="/dashboard"
                  className={`${accountOutlineDesktopClass} ${dashboardSectionActive ? dashboardDesktopActiveClass : ""}`}
                  aria-current={dashboardSectionActive ? "page" : undefined}
                >
                  {t("nav.dashboard")}
                </Link>
                <button type="button" onClick={logout} className={`${accountOutlineDesktopClass} cursor-pointer`}>
                  {t("dashboard.logout")}
                </button>
              </>
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
                <div className="mb-2 flex flex-col gap-2">
                  <Link
                    href="/calculator"
                    onClick={closeMobileMenu}
                    className={`${roiClassName} flex w-full justify-center`}
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white shadow-sm" aria-hidden />
                    {t("nav.calculator")}
                  </Link>
                  <Link
                    href="/demo"
                    onClick={closeMobileMenu}
                    className={`${demoClassName} flex w-full justify-center`}
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-sm" aria-hidden />
                    {t("nav.demo")}
                  </Link>
                  <Link
                    href="/dashboard/calendar"
                    onClick={closeMobileMenu}
                    className={`${calendarNavPillClassName} flex w-full justify-center ${calendarActive ? "ring-4 ring-white/95 ring-offset-2 ring-offset-[var(--twin-card)]" : ""}`}
                    aria-current={calendarActive ? "page" : undefined}
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-sm" aria-hidden />
                    {t("dashboard.calendarLink")}
                  </Link>
                  {hasSession ? (
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className={`twin-touch-target inline-flex w-full items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-center text-sm font-semibold leading-none text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] ${dashboardSectionActive ? "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]" : ""}`}
                      aria-current={dashboardSectionActive ? "page" : undefined}
                    >
                      {t("nav.dashboard")}
                    </Link>
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
                    className="twin-touch-target mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-center text-sm font-semibold leading-none text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)]"
                  >
                    {t("dashboard.logout")}
                  </button>
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
