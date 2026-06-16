"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";
import { PersonaBadge } from "@/components/persona-badge";
import { useMarketingPersona } from "@/components/persona-provider";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { isDemoUserEmail } from "@/lib/demo-user";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";
import {
  CANDIDATE_CALENDAR_HREF,
  headerAccountLinks,
  headerSessionNavLinks,
  isSessionNavLinkActive,
  logoutRedirectPath,
  showCandidateDemoNav,
} from "@/lib/persona-access";

/** Workspace-only header — no corporate marketing nav or marquee brand arrays. */
export function WorkspaceSiteHeaderBar() {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [hasSession, setHasSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [locationHash, setLocationHash] = useState("");
  const sessionNavLinks = headerSessionNavLinks(persona, hasSession);
  const showDemoNav = showCandidateDemoNav(persona, hasSession);
  const accountLinks = headerAccountLinks(persona, hasSession, { marketingChrome: false });
  const demoActive = pathname === "/demo" || pathname.startsWith("/demo/");
  const dashboardSectionActive =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/") && !pathname.startsWith(CANDIDATE_CALENDAR_HREF));
  const highlightDemoNav = isDemoUserEmail(userEmail);

  useEffect(() => {
    const sync = () => setHasSession(Boolean(getToken()));
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]);

  useEffect(() => {
    const syncHash = () => queueMicrotask(() => setLocationHash(window.location.hash));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    const token = getToken();
    if (!token || !hasSession) {
      queueMicrotask(() => setUserEmail(null));
      return;
    }
    let cancelled = false;
    void apiFetch<{ email?: string }>("/api/v1/auth/me", {}, token)
      .then((me) => {
        if (!cancelled) setUserEmail(me.email ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserEmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSession, pathname]);

  const closeMobileMenu = () => {
    const d = mobileMenuRef.current;
    if (d) d.open = false;
  };

  const headerCtaBase = "twin-header-cta twin-touch-target";
  const demoPillClassName = `${headerCtaBase} twin-header-cta--roi twin-nav-roi-pill twin-nav-demo-pill${
    highlightDemoNav ? " twin-header-cta--demo-pulse" : ""
  }`;
  const linkClass = "twin-nav-link whitespace-nowrap";
  const accountOutlineClass =
    "twin-header-account-link twin-touch-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-0 text-[12px] font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] sm:px-3 sm:text-[13px]";
  const dashboardActiveClass =
    "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]";

  const logout = () => {
    const loginPath = logoutRedirectPath(persona);
    clearToken();
    closeMobileMenu();
    router.push(loginPath);
  };

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex flex-wrap items-center gap-x-3 gap-y-2 py-3 lg:gap-x-4 lg:py-3.5">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="twin-logo shrink-0">
            TWIN<span className="twin-logo-accent">.</span>
          </Link>
          {showDemoNav ? (
            <Link
              href="/demo"
              className={demoPillClassName}
              aria-current={demoActive ? "page" : undefined}
            >
              {t("nav.demo")}
            </Link>
          ) : null}
        </div>

        <nav
          className="order-3 hidden min-w-0 flex-1 basis-full flex-nowrap items-center justify-center gap-x-3 overflow-x-auto overscroll-x-contain text-[13px] font-medium [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-4 sm:text-sm md:order-none md:flex md:basis-auto lg:gap-x-5 lg:text-[0.9375rem] [&::-webkit-scrollbar]:hidden"
          aria-label={t("nav.ariaSiteNav")}
        >
          {sessionNavLinks.map((item) => {
            const active = isSessionNavLinkActive(pathname, locationHash, item.href);
            const hashNav = item.href.includes("#");
            return hashNav ? (
              <a
                key={item.href}
                href={item.href}
                onClick={scrollToDashboardHash}
                className={`${linkClass} ${active ? "text-[var(--twin-accent)]" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t(item.labelKey)}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`${linkClass} ${active ? "text-[var(--twin-accent)]" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {accountLinks.map((item) =>
            item.isLogout ? (
              <button
                key="logout"
                type="button"
                onClick={logout}
                className={`${accountOutlineClass} hidden cursor-pointer md:inline-flex`}
              >
                {t(item.labelKey)}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`${accountOutlineClass} hidden md:inline-flex ${
                  item.href === "/dashboard" && dashboardSectionActive ? dashboardActiveClass : ""
                }`}
                aria-current={item.href === "/dashboard" && dashboardSectionActive ? "page" : undefined}
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
          {hasSession ? <PersonaBadge /> : null}
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
              {hasSession ? (
                <>
                  <p className="mt-1 border-t border-[var(--twin-border)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                    {t("nav.ariaProductNav")}
                  </p>
                  {sessionNavLinks.map((item) =>
                    item.href.includes("#") ? (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(e) => {
                          scrollToDashboardHash(e);
                          closeMobileMenu();
                        }}
                        className="twin-touch-target twin-nav-link block whitespace-nowrap rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                      >
                        {t(item.labelKey)}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="twin-touch-target twin-nav-link block whitespace-nowrap rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                      >
                        {t(item.labelKey)}
                      </Link>
                    ),
                  )}
                </>
              ) : null}
              {accountLinks.map((item) =>
                item.isLogout ? (
                  <button
                    key="logout-m"
                    type="button"
                    onClick={logout}
                    className="twin-header-account-link twin-touch-target mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-2.5 text-sm font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)]"
                  >
                    {t("dashboard.logout")}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="twin-header-account-link twin-touch-target twin-nav-link block whitespace-nowrap rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
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
