"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";

export function Header() {
  const { t } = useTranslation();

  const nav = [
    { href: "/login" as const, label: t("nav.login") },
    { href: "/register" as const, label: t("nav.register") },
    { href: "/profile" as const, label: t("nav.profile") },
    { href: "/dashboard" as const, label: t("nav.dashboard") },
  ];

  return (
    <header className="twin-header-bar relative z-10">
      <div className="twin-header-stripe" aria-hidden />
      <div className="twin-container flex items-center justify-between gap-4 py-3 sm:py-3.5">
        <Link href="/" className="twin-logo shrink-0">
          TWIN<span className="twin-logo-accent">.</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <nav className="flex items-center gap-5 text-sm" aria-label="Main">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="twin-nav-link font-medium">
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
              className="absolute right-0 z-20 mt-2 min-w-[11rem] rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-2 shadow-lg"
              aria-label="Main"
              style={{ boxShadow: "var(--twin-shadow-md)" }}
            >
              {nav.map((item) => (
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
