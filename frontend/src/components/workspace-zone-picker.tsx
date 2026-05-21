"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { Card, Shell } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import { WORKSPACE_PATH } from "@/lib/persona-auth";

const ZONES: {
  persona: MarketingPersona;
  title: TranslationKey;
  lead: TranslationKey;
  tools: TranslationKey;
}[] = [
  {
    persona: "candidate",
    title: "workspace.zoneCandidateTitle",
    lead: "workspace.zoneCandidateLead",
    tools: "workspace.zoneCandidateTools",
  },
  {
    persona: "recruiter",
    title: "workspace.zoneRecruiterTitle",
    lead: "workspace.zoneRecruiterLead",
    tools: "workspace.zoneRecruiterTools",
  },
  {
    persona: "company",
    title: "workspace.zoneInvestorTitle",
    lead: "workspace.zoneInvestorLead",
    tools: "workspace.zoneInvestorTools",
  },
];

export function WorkspaceZonePicker() {
  const { t } = useTranslation();
  const { setPersona } = useMarketingPersona();
  const router = useRouter();

  const enter = (persona: MarketingPersona) => {
    setPersona(persona);
    router.push(WORKSPACE_PATH[persona]);
  };

  return (
    <Shell wide>
      <div className="mx-auto max-w-4xl">
        <h1 className="twin-section-title text-2xl sm:text-3xl">{t("workspace.pickerTitle")}</h1>
        <p className="twin-muted mt-3 max-w-2xl text-sm leading-relaxed">{t("workspace.pickerLead")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ZONES.map((z) => (
            <Card key={z.persona} variant="soft" className="flex flex-col p-5">
              <h2 className="text-lg font-semibold">{t(z.title)}</h2>
              <p className="twin-muted mt-2 flex-1 text-sm leading-relaxed">{t(z.lead)}</p>
              <p className="mt-3 text-xs font-medium text-[var(--twin-accent)]">{t(z.tools)}</p>
              <button
                type="button"
                className="twin-btn-primary twin-touch-target mt-5 w-full"
                onClick={() => enter(z.persona)}
              >
                {t("workspace.enterZone")}
              </button>
            </Card>
          ))}
        </div>
        <p className="twin-muted mt-8 text-center text-xs">
          <Link href="/" className="twin-link">
            {t("workspace.backMarketing")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
