"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { getToken } from "@/lib/auth";
import { headerAccountLinks } from "@/lib/persona-access";

/** Auth-only header — logo, account links, language; no marketing persona nav arrays. */
export function AuthSiteHeaderBar() {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const [hasSession, setHasSession] = useState(false);
  const accountLinks = headerAccountLinks(persona, hasSession, { marketingChrome: false });

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

  const accountOutlineClass =
    "twin-header-account-link twin-touch-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-[var(--twin-border)] bg-[var(--twin-card)] px-2.5 py-0 text-[12px] font-semibold leading-normal text-[var(--twin-accent)] transition hover:border-[var(--twin-accent)]/50 hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-accent-hover)] sm:px-3 sm:text-[13px]";

  return (
    <header className="twin-header-bar sticky top-0 z-50">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex flex-wrap items-center gap-x-3 gap-y-2 py-3 lg:gap-x-4 lg:py-3.5">
        <Link href="/" className="twin-logo shrink-0">
          TWIN<span className="twin-logo-accent">.</span>
        </Link>

        <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          {accountLinks.map((item) =>
            item.isLogout ? null : (
              <Link
                key={item.href}
                href={item.href}
                className={`${accountOutlineClass} inline-flex`}
              >
                {t(item.labelKey)}
              </Link>
            ),
          )}
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
              {accountLinks.map((item) =>
                item.isLogout ? null : (
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
