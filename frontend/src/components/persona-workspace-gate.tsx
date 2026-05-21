"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Card, Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import { LOGIN_PATH, WORKSPACE_PATH } from "@/lib/persona-auth";
import { personaGateRedirect } from "@/lib/persona-access";

const SURFACE_COPY: Record<
  "candidate" | "recruiter" | "investor",
  { title: TranslationKey; lead: TranslationKey }
> = {
  candidate: {
    title: "workspace.gateTitleCandidate",
    lead: "workspace.gateLeadCandidate",
  },
  recruiter: {
    title: "workspace.gateTitleRecruiter",
    lead: "workspace.gateLeadRecruiter",
  },
  investor: {
    title: "workspace.gateTitleInvestor",
    lead: "workspace.gateLeadInvestor",
  },
};

const PERSONA_LABEL: Record<MarketingPersona, TranslationKey> = {
  candidate: "nav.personaCandidate",
  recruiter: "nav.personaRecruiter",
  company: "nav.personaCompany",
  investor: "nav.personaInvestor",
};

const linkClass =
  "twin-link inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-md border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 text-sm font-medium transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)]";

const primaryClass =
  "marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-cta)] px-4 text-sm font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)]";

/**
 * Blocks content when the active persona or session does not match this workspace lane.
 */
export function PersonaWorkspaceGate({
  allowed,
  surface,
  children,
}: {
  allowed: readonly MarketingPersona[];
  surface: "candidate" | "recruiter" | "investor";
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { persona, setPersona } = useMarketingPersona();
  const router = useRouter();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const copy = SURFACE_COPY[surface];
  const loginZone = allowed[0] ?? "candidate";

  useEffect(() => {
    setHasSession(Boolean(getToken()));
  }, [pathname]);

  if (hasSession === null) {
    return (
      <Shell wide>
        <p className="twin-muted text-sm">…</p>
      </Shell>
    );
  }

  if (!hasSession) {
    router.replace(LOGIN_PATH[loginZone]);
    return null;
  }

  if (allowed.includes(persona)) {
    return <>{children}</>;
  }

  const goToMyWorkspace = () => {
    setPersona(persona);
    router.replace(WORKSPACE_PATH[persona]);
  };

  const suggested =
    persona === "investor"
      ? [
          { href: WORKSPACE_PATH.investor, label: "workspace.investorHome" as TranslationKey },
          { href: "/investor/calculator", label: "nav.calculatorInvestor" as TranslationKey },
        ]
      : persona === "company"
        ? [
            { href: WORKSPACE_PATH.company, label: "nav.forCompanies" as TranslationKey },
            { href: "/calculator/b2b", label: "nav.calculatorB2bForCompanies" as TranslationKey },
          ]
      : persona === "recruiter"
        ? [
            { href: WORKSPACE_PATH.recruiter, label: "workspace.recruiterHome" as TranslationKey },
            { href: "/calculator/b2b", label: "nav.calculatorB2bForCompanies" as TranslationKey },
          ]
        : [
            { href: WORKSPACE_PATH.candidate, label: "workspace.candidateHome" as TranslationKey },
            { href: "/demo", label: "nav.demo" as TranslationKey },
          ];

  return (
    <Shell wide>
      <Card variant="soft" className="p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("nav.ariaPersonaNav")}: {t(PERSONA_LABEL[persona])}
        </p>
        <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(copy.title)}</h1>
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t(copy.lead)}</p>
        {pathname ? (
          <p className="twin-muted mt-3 text-sm">
            {t("dashboard.workspaceGateSubpathNotice").replace("{path}", pathname)}
          </p>
        ) : null}
        <div className="marketing-cta-stack mt-8">
          {suggested.map((item) => (
            <Link key={item.href} href={item.href} className={primaryClass}>
              {t(item.label)}
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/workspace" className={`${linkClass} sm:!w-auto`}>
            {t("workspace.switchContext")}
          </Link>
          <Link href={personaGateRedirect(persona)} className={`${linkClass} sm:!w-auto`}>
            {t("workspace.marketingStory")}
          </Link>
        </div>
        <div className="mt-8 border-t border-[var(--twin-border)] pt-6">
          <button type="button" className="twin-btn-secondary twin-touch-target" onClick={goToMyWorkspace}>
            {t("workspace.goMyWorkspace")}
          </button>
        </div>
      </Card>
    </Shell>
  );
}
