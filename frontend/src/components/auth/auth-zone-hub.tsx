"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import type { LoginZone } from "@/lib/persona-auth";

type ZoneConfig = {
  id: LoginZone;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  icon: ReactNode;
};

const ZONES: ZoneConfig[] = [
  {
    id: "candidate",
    titleKey: "workspace.zoneCandidateTitle",
    subtitleKey: "workspace.zoneCandidateTools",
    icon: <IconCandidate />,
  },
  {
    id: "recruiter",
    titleKey: "workspace.zoneRecruiterTitle",
    subtitleKey: "workspace.zoneRecruiterTools",
    icon: <IconRecruiter />,
  },
  {
    id: "company",
    titleKey: "workspace.zoneCompanyTitle",
    subtitleKey: "workspace.zoneCompanyTools",
    icon: <IconCompany />,
  },
  {
    id: "investor",
    titleKey: "workspace.zoneInvestorTitle",
    subtitleKey: "workspace.zoneInvestorTools",
    icon: <IconInvestor />,
  },
];

export function AuthZoneHub({
  hubTitleKey,
  hubLeadKey,
  paths,
  highlightRoleCards = false,
}: {
  hubTitleKey: TranslationKey;
  hubLeadKey: TranslationKey;
  paths: Record<LoginZone, string>;
  highlightRoleCards?: boolean;
}) {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightRoleCards || !gridRef.current) return;
    const id = window.setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [highlightRoleCards]);

  return (
    <Card className="twin-auth-zone-hub !p-5 sm:!p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        TWIN
      </p>
      <h1 className="twin-auth-zone-hub__title mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
        {t(hubTitleKey)}
      </h1>
      <p className="twin-auth-zone-hub__lead twin-muted mt-3 max-w-2xl text-sm leading-relaxed sm:text-[15px]">
        {t(hubLeadKey)}
      </p>
      <div
        ref={gridRef}
        id="role-cards"
        className={`twin-auth-zone-hub__grid mt-8${
          highlightRoleCards ? " twin-auth-zone-hub__grid--prompt" : ""
        }`}
      >
        {ZONES.map((zone) => (
          <Link
            key={zone.id}
            href={paths[zone.id]}
            className="twin-auth-zone-hub__card group twin-touch-target flex min-h-[11rem] min-w-[220px] flex-col rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--twin-accent)]/45 hover:bg-[var(--twin-accent-muted)]/35 hover:shadow-[0_12px_40px_-12px_rgb(16_185_129_/_0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)] active:scale-[0.99]"
            aria-label={`${t(zone.titleKey)} — ${t(zone.subtitleKey)}`}
          >
            <span
              className="mb-4 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--twin-accent-muted)] text-[var(--twin-accent)] ring-1 ring-[var(--twin-accent)]/25 transition group-hover:bg-[var(--twin-accent)]/20 group-hover:ring-[var(--twin-accent)]/50"
              aria-hidden
            >
              {zone.icon}
            </span>
            <span className="twin-auth-zone-hub__card-title text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
              {t(zone.titleKey)}
            </span>
            <span className="twin-auth-zone-hub__card-sub twin-muted mt-2 text-sm leading-snug">
              {t(zone.subtitleKey)}
            </span>
            <span className="mt-auto pt-4 text-xs font-semibold text-[var(--twin-accent)] opacity-80 transition group-hover:opacity-100">
              {t("workspace.enterZone")} →
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function IconCandidate({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconRecruiter({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function IconCompany({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v0" />
      <path d="M9 12v0" />
      <path d="M9 15v0" />
      <path d="M9 18v0" />
    </svg>
  );
}

function IconInvestor({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-6" />
    </svg>
  );
}
