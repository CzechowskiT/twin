"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const TIPS = [
  "site.momentumTip1",
  "site.momentumTip2",
  "site.momentumTip3",
  "site.momentumTip4",
  "site.momentumTip5",
  "site.momentumTip6",
] as const satisfies readonly TranslationKey[];

function tipIndex(pathname: string, offset: number): number {
  let h = offset * 31;
  for (let i = 0; i < pathname.length; i++) {
    h = (h + pathname.charCodeAt(i) * (i + 1)) % 997;
  }
  return h % TIPS.length;
}

type Cta = { href: string; label: TranslationKey };

function resolveCtas(pathname: string, variant: "app" | "marketing"): Cta[] {
  if (variant === "marketing") {
    return [
      { href: "/register", label: "site.momentumCtaRegister" },
      { href: "/login", label: "site.momentumCtaLogin" },
      { href: "/faq", label: "site.momentumCtaFaq" },
    ];
  }
  if (pathname.startsWith("/admin")) {
    return [{ href: "/", label: "site.momentumCtaHome" }];
  }
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback")
  ) {
    return [
      { href: "/faq", label: "site.momentumCtaFaq" },
      pathname.startsWith("/login")
        ? { href: "/register", label: "site.momentumCtaRegister" }
        : { href: "/login", label: "site.momentumCtaLogin" },
    ];
  }
  if (pathname.startsWith("/dashboard")) {
    return [
      { href: "/profile", label: "site.momentumCtaProfile" },
      { href: "/dashboard/billing", label: "dashboard.billingLink" },
    ];
  }
  if (pathname.startsWith("/profile")) {
    return [
      { href: "/dashboard", label: "site.momentumCtaWorkspace" },
      { href: "/dashboard/billing", label: "dashboard.billingLink" },
    ];
  }
  return [
    { href: "/dashboard", label: "site.momentumCtaWorkspace" },
    { href: "/profile", label: "site.momentumCtaProfile" },
  ];
}

export function PageMomentumRail({
  variant = "app",
  className = "",
}: {
  variant?: "app" | "marketing";
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();

  const primaryTip = useMemo(() => TIPS[tipIndex(pathname, 0)], [pathname]);
  const secondaryTip = useMemo(() => TIPS[tipIndex(pathname, 1)], [pathname]);
  const ctas = useMemo(() => resolveCtas(pathname, variant), [pathname, variant]);

  const shell =
    variant === "marketing"
      ? "border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/35"
      : "border-[var(--twin-border)] bg-[var(--twin-card)]/85";

  return (
    <aside
      className={`mt-auto w-full shrink-0 border-t ${shell} ${variant === "marketing" ? "py-8" : "rounded-xl py-5 sm:py-6"} ${className}`}
      aria-label={t("site.momentumAria")}
    >
      <div className={variant === "marketing" ? "twin-container" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("site.momentumEyebrow")}
        </p>
        <p className="mt-1 text-sm font-medium text-[var(--twin-muted-strong)]">{t("site.momentumLead")}</p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t(primaryTip)}</p>
        {secondaryTip !== primaryTip ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--twin-muted)]">{t(secondaryTip)}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {ctas.map((c) => (
            <Link key={c.href} href={c.href} className="twin-link text-sm font-medium">
              {t(c.label)}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
