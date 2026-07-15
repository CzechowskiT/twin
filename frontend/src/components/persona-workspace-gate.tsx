"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import {
  PersonaWorkspaceGateCard,
  PersonaWorkspaceGateShell,
} from "@/components/persona-workspace-gate-shell";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { clearToken, hasActiveSession } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import { buildAuthRedirectNext, lockAuthRedirectDestination, loginPathWithNext } from "@/lib/login-redirect";
import type { MarketingPersona } from "@/lib/marketing-persona";
import {
  isPathAllowedForPersona,
  logoutRedirectPath,
  resolveEffectiveSessionPersona,
} from "@/lib/persona-access";
import { LOGIN_PATH, WORKSPACE_PATH } from "@/lib/persona-auth";
import { hasRecruiterPilotInboxSession } from "@/lib/recruiter-inbox";
import { hasRecruiterJwtSession } from "@/lib/recruiter-jwt";

const SURFACE_COPY: Record<
  "candidate" | "recruiter" | "investor" | "company",
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
  company: {
    title: "workspace.gateTitleCompany",
    lead: "workspace.gateLeadCompany",
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
  surface: "candidate" | "recruiter" | "investor" | "company";
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const pathname = usePathname();
  const router = useRouter();
  const copy = SURFACE_COPY[surface];
  const loginZone = allowed[0] ?? "candidate";
  const loginPath = LOGIN_PATH[loginZone];
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [hasPilotRecruiter, setHasPilotRecruiter] = useState(false);
  const effectivePersona = resolveEffectiveSessionPersona(pathname, persona);
  const authDestinationRef = useRef<string | null>(null);
  const personaRedirectedRef = useRef(false);
  const loginWithNext = useMemo(() => {
    const destination = lockAuthRedirectDestination(
      authDestinationRef,
      pathname,
      loginPath,
      null,
    );
    return loginPathWithNext(loginPath, destination);
  }, [loginPath, pathname]);

  useEffect(() => {
    queueMicrotask(() => {
      setHasSession(hasActiveSession());
      setHasPilotRecruiter(
        surface === "recruiter" && (hasRecruiterJwtSession() || hasRecruiterPilotInboxSession()),
      );
    });
  }, [pathname, surface]);

  useEffect(() => {
    if (!hasSession) return;
    if (allowed.includes(effectivePersona)) return;
    if (isPathAllowedForPersona(pathname, effectivePersona)) return;
    if (personaRedirectedRef.current) return;
    personaRedirectedRef.current = true;
    router.replace(WORKSPACE_PATH[effectivePersona]);
  }, [allowed, effectivePersona, hasSession, pathname, router]);

  if (hasSession === null) {
    return <WorkspaceRouteSkeleton />;
  }

  if (!hasSession) {
    if (surface === "recruiter" && hasPilotRecruiter) {
      return <>{children}</>;
    }
    return (
      <PersonaWorkspaceGateShell>
        <PersonaWorkspaceGateCard>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("workspace.authRequiredTitle")}
          </p>
          <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(copy.title)}</h1>
          <p className="twin-muted mt-4 text-sm leading-relaxed">{t("workspace.authRequiredLead")}</p>
          <p className="twin-muted mt-2 text-xs">{t("workspace.authRedirecting")}</p>
          <div className="mt-8">
            <Link href={loginWithNext} className="twin-btn-primary twin-touch-target">
              {t("workspace.authRequiredCta")}
            </Link>
          </div>
        </PersonaWorkspaceGateCard>
      </PersonaWorkspaceGateShell>
    );
  }

  if (allowed.includes(effectivePersona)) {
    return <>{children}</>;
  }

  return (
    <PersonaWorkspaceGateShell>
      <PersonaWorkspaceGateCard>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("nav.ariaPersonaNav")}: {t(PERSONA_LABEL[effectivePersona])}
        </p>
        <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{t(copy.title)}</h1>
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t(copy.lead)}</p>
        <p className="twin-muted mt-4 text-sm leading-relaxed">{t("nav.logoutToSwitchRole")}</p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link href={WORKSPACE_PATH[effectivePersona]} className="twin-btn-primary twin-touch-target">
            {t("workspace.goMyWorkspace")}
          </Link>
          <button
            type="button"
            className="twin-btn-secondary twin-touch-target"
            onClick={() => {
              clearToken();
              router.replace(logoutRedirectPath(effectivePersona));
            }}
          >
            {t("dashboard.logout")}
          </button>
        </div>
      </PersonaWorkspaceGateCard>
    </PersonaWorkspaceGateShell>
  );
}
