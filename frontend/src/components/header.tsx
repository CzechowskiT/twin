"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/components/language-provider";

export function Header() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const nav = [
    { href: "/login" as const, label: t("nav.login") },
    { href: "/register" as const, label: t("nav.register") },
    { href: "/profile" as const, label: t("nav.profile") },
    { href: "/dashboard" as const, label: t("nav.dashboard") },
  ];

  return (
    <header
      className={
        isHome
          ? "relative z-10 border-b border-white/10 bg-black/25 shadow-[0_8px_32px_-12px_rgb(0_0_0/0.65)] backdrop-blur-xl supports-[backdrop-filter]:bg-black/15"
          : "twin-header-bar relative z-10"
      }
    >
      <div
        className={
          isHome
            ? "h-px bg-gradient-to-r from-transparent via-sky-400/40 to-violet-500/35"
            : "twin-header-stripe"
        }
        aria-hidden
      />
      <div className="twin-container flex items-center justify-between gap-4 py-3 sm:py-3.5">
        <Link
          href="/"
          className={
            isHome
              ? "shrink-0 text-xl font-bold tracking-tight text-white [text-shadow:0_0_24px_rgb(59_130_246/0.25)]"
              : "twin-logo shrink-0"
          }
        >
          TWIN
          <span className={isHome ? "text-sky-400" : "twin-logo-accent"}>.</span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <nav className="flex items-center gap-5 text-sm" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isHome
                    ? "font-medium text-zinc-400 transition hover:text-white"
                    : "twin-nav-link font-medium"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher variant={isHome ? "dark" : "default"} />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher variant={isHome ? "dark" : "default"} />
          <details className="relative">
            <summary
              className={
                isHome
                  ? "twin-touch-target flex cursor-pointer list-none items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white backdrop-blur-sm [&::-webkit-details-marker]:hidden"
                  : "twin-touch-target flex cursor-pointer list-none items-center justify-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden"
              }
            >
              {t("nav.menu")}
            </summary>
            <nav
              className={
                isHome
                  ? "absolute right-0 z-20 mt-2 min-w-[11rem] rounded-xl border border-white/12 bg-zinc-950/95 p-2 shadow-xl backdrop-blur-xl"
                  : "absolute right-0 z-20 mt-2 min-w-[11rem] rounded border border-[var(--twin-border)] bg-[var(--twin-card)] p-2 shadow-lg"
              }
              aria-label="Main"
              style={isHome ? undefined : { boxShadow: "var(--twin-shadow-md)" }}
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    isHome
                      ? "twin-touch-target block rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/10 hover:text-white"
                      : "twin-touch-target twin-nav-link block rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
                  }
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
