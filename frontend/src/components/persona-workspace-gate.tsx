"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Card, Shell } from "@/components/ui";
import { clearToken, getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import { LOGIN_PATH, WORKSPACE_PATH } from "@/lib/persona-auth";
import { logoutRedirectPath } from "@/lib/persona-access";

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

/**
 * Blocks content when the active session persona does not match this workspace lane.
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
  const { persona } = useMarketingPersona();
  const router = useRouter();
  const copy = SURFACE_COPY[surface];
  const loginZone = allowed[0] ?? "candidate";

  useEffect(() => {
    if (!getToken()) {
      router.replace(LOGIN_PATH[loginZone]);
      return;
    }
    if (!allowed.includes(persona)) {
      router.replace(WORKSPACE_PATH[persona]);
    }
  }, [allowed, loginZone, persona, router]);

  if (!getToken()) return null;

  if (allowed.includes(persona)) {
    return <>{children}</>;
  }

  return (
    <Shell wide>
      <Card variant="soft" className="p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("nav.ariaPersonaNav")}: {t(PERSONA_LABEL[persona])}
        </p>
        <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(copy.title)}</h1>
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t(copy.lead)}</p>
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t("nav.logoutToSwitchRole")}</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link href={WORKSPACE_PATH[persona]} className="twin-btn-primary twin-touch-target">
            {t("workspace.goMyWorkspace")}
          </Link>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target"
            onClick={() => {
              clearToken();
              router.replace(logoutRedirectPath(persona));
            }}
          >
            {t("dashboard.logout")}
          </button>
        </div>
      </Card>
    </Shell>
  );
}
