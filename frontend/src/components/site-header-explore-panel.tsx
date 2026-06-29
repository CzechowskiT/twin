"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  HEADER_EXPLORE_MEGA_PANEL_GROUPS,
  type ExploreMegaPanelLink,
} from "@/lib/public-explore-mega-panel-routes";

type SiteHeaderExplorePanelProps = {
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ExploreLink({
  link,
  pathname,
  onNavigate,
  mobile,
}: {
  link: ExploreMegaPanelLink;
  pathname: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { t } = useTranslation();
  const active = isLinkActive(pathname, link.href);
  const base = mobile
    ? "twin-touch-target twin-nav-link block whitespace-nowrap rounded px-3 py-2.5 text-sm hover:bg-[var(--twin-accent-muted)]"
    : "block rounded-md px-2 py-1.5 text-[13px] font-medium leading-snug transition hover:bg-[var(--twin-accent-muted)]/60";
  const highlight = link.highlight ? " text-[var(--twin-accent)]" : "";
  const activeClass = active ? " text-[var(--twin-accent)]" : "";

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={`${base}${highlight}${activeClass}`}
      aria-current={active ? "page" : undefined}
    >
      {t(link.labelKey)}
    </Link>
  );
}

/** Explore / Poznaj TWIN mega-panel — grouped workspace and trust shortcuts. */
export function SiteHeaderExplorePanel({ variant, onNavigate }: SiteHeaderExplorePanelProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const el = detailsRef.current;
      if (!el?.open) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        el.open = false;
      }
    };
    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, []);

  if (variant === "mobile") {
    return (
      <>
        <p className="mt-2 border-t border-[var(--twin-border)] px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("nav.exploreTwin")}
        </p>
        {HEADER_EXPLORE_MEGA_PANEL_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--twin-muted)]">
              {t(group.titleKey)}
            </p>
            {group.links.map((link) => (
              <ExploreLink
                key={link.href}
                link={link}
                pathname={pathname}
                onNavigate={onNavigate}
                mobile
              />
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <details ref={detailsRef} className="relative shrink-0">
      <summary
        className="twin-nav-link shrink-0 cursor-pointer list-none whitespace-normal sm:whitespace-nowrap [&::-webkit-details-marker]:hidden"
        aria-haspopup="true"
      >
        {t("nav.exploreTwin")}
      </summary>
      <div
        className="absolute left-1/2 top-full z-30 mt-2 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 shadow-lg"
        style={{ boxShadow: "var(--twin-shadow-md)" }}
        role="region"
        aria-label={t("nav.ariaExplorePanel")}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          {HEADER_EXPLORE_MEGA_PANEL_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
                {t(group.titleKey)}
              </p>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {group.links.map((link) => (
                  <ExploreLink
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onNavigate={() => {
                      if (detailsRef.current) detailsRef.current.open = false;
                      onNavigate?.();
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
