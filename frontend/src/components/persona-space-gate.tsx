"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  isPathAllowedForPersona,
  personaGateRedirect,
  type PersonaAudience,
} from "@/lib/persona-access";
import type { MarketingPersona } from "@/lib/marketing-persona";

const linkClass =
  "twin-link inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 text-sm font-medium transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)]";

const primaryClass =
  "marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-cta)] px-4 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]";

type GateSurface = "calculator" | "calculatorB2b" | "recruiter";

const SURFACE_I18N: Record<
  GateSurface,
  {
    title: "dashboard.workspaceGateTitleCompany" | "dashboard.workspaceGateTitleRecruiter";
    lead: "dashboard.workspaceGateLeadCompany" | "dashboard.workspaceGateLeadRecruiter";
  }
> = {
  calculator: {
    title: "dashboard.workspaceGateTitleCompany",
    lead: "dashboard.workspaceGateLeadCompany",
  },
  calculatorB2b: {
    title: "dashboard.workspaceGateTitleCompany",
    lead: "dashboard.workspaceGateLeadCompany",
  },
  recruiter: {
    title: "dashboard.workspaceGateTitleRecruiter",
    lead: "dashboard.workspaceGateLeadRecruiter",
  },
};

function personaLabelKey(persona: MarketingPersona): "nav.personaCandidate" | "nav.personaRecruiter" | "nav.personaCompany" {
  if (persona === "recruiter") return "nav.personaRecruiter";
  if (persona === "company") return "nav.personaCompany";
  return "nav.personaCandidate";
}

/** Blocks content when the active persona may not use this route prefix. */
export function PersonaSpaceGate({
  allowed,
  surface,
  children,
}: {
  allowed: readonly PersonaAudience[];
  surface: GateSurface;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();

  if (isPathAllowedForPersona(pathname, persona) && allowed.includes(persona)) {
    return <>{children}</>;
  }

  const copy = SURFACE_I18N[surface];
  const home = personaGateRedirect(persona);

  return (
    <Shell wide>
      <Card variant="soft" className="p-6 sm:p-8">
        <div className="marketing-hero-rail text-start">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("nav.ariaPersonaNav")}: {t(personaLabelKey(persona))}
          </p>
          <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(copy.title)}</h1>
          <p className="twin-muted mt-4 text-sm leading-relaxed">{t(copy.lead)}</p>
          {pathname ? (
            <p className="twin-muted mt-3 text-sm">
              {t("dashboard.workspaceGateSubpathNotice").replace("{path}", pathname)}
            </p>
          ) : null}
          <div className="marketing-cta-stack mt-8">
            <Link href={home} className={primaryClass}>
              {t(
                persona === "company"
                  ? "dashboard.workspaceGateLinkForCompanies"
                  : persona === "recruiter"
                    ? "dashboard.workspaceGateLinkForRecruiters"
                    : "nav.forCandidates"
              )}
            </Link>
            {surface !== "calculatorB2b" ? (
              <Link href="/calculator/b2b" className={linkClass}>
                {t("dashboard.workspaceGateLinkB2bCalculator")}
              </Link>
            ) : null}
          </div>
        </div>
      </Card>
    </Shell>
  );
}
