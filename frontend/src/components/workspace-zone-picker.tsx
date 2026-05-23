"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Card, Shell } from "@/components/ui";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import { WORKSPACE_PATH } from "@/lib/persona-auth";
import { getSessionPersona } from "@/lib/session-persona";

const ZONE_COPY: Record<
  MarketingPersona,
  { title: TranslationKey; lead: TranslationKey; tools: TranslationKey }
> = {
  candidate: {
    title: "workspace.zoneCandidateTitle",
    lead: "workspace.zoneCandidateLead",
    tools: "workspace.zoneCandidateTools",
  },
  recruiter: {
    title: "workspace.zoneRecruiterTitle",
    lead: "workspace.zoneRecruiterLead",
    tools: "workspace.zoneRecruiterTools",
  },
  company: {
    title: "workspace.zoneCompanyTitle",
    lead: "workspace.zoneCompanyLead",
    tools: "workspace.zoneCompanyTools",
  },
  investor: {
    title: "workspace.zoneInvestorTitle",
    lead: "workspace.zoneInvestorLead",
    tools: "workspace.zoneInvestorTools",
  },
};

export function WorkspaceZonePicker() {
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const router = useRouter();
  const sessionPersona = getSessionPersona() ?? persona;
  const zone = ZONE_COPY[sessionPersona];

  useEffect(() => {
    if (getToken()) {
      router.replace(WORKSPACE_PATH[sessionPersona]);
    }
  }, [router, sessionPersona]);

  return (
    <Shell wide>
      <div className="mx-auto max-w-lg">
        <Card variant="soft" className="p-6 sm:p-8">
          <h1 className="twin-section-title text-2xl sm:text-3xl">{t(zone.title)}</h1>
          <p className="twin-muted mt-3 text-sm leading-relaxed">{t(zone.lead)}</p>
          <p className="mt-3 text-xs font-medium text-[var(--twin-accent)]">{t(zone.tools)}</p>
          <p className="twin-muted mt-4 text-sm leading-relaxed">{t("workspace.logoutToSwitchHint")}</p>
          <Link href={WORKSPACE_PATH[sessionPersona]} className="twin-btn-primary twin-touch-target mt-6 inline-flex">
            {t("workspace.enterZone")}
          </Link>
        </Card>
      </div>
    </Shell>
  );
}
