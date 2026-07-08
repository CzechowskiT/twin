"use client";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";
import { ReferralsDashboard } from "@/components/referrals/referrals-dashboard";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { REFERRALS_LIMITED_PILOT } from "@/lib/seven-day-d2-candidate";

export default function DashboardReferralsPage() {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <header className="min-w-0 flex-1 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("referrals.title")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("referrals.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("referrals.lead")}</p>
        <p className="twin-muted max-w-2xl text-xs leading-relaxed">{t("referrals.rewardModelNote")}</p>
        </header>
        <DemoJourneyPilotStatus status="pilot" showLead={false} />
        <CandidateWorkspaceSubnav ariaLabel={t("referrals.title")} />
      </div>
      {REFERRALS_LIMITED_PILOT ? (
        <Card
          variant="soft"
          className="mb-6 border-amber-500/30 bg-amber-500/5 p-4"
          data-seven-day-referrals-pilot-boundary
        >
          <h2 className="text-sm font-semibold text-amber-100">{t("referrals.pilotBoundaryTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("referrals.pilotBoundaryBody")}</p>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("referrals.pilotNoOutreachNote")}</p>
        </Card>
      ) : null}
      <ReferralsDashboard />
    </Shell>
  );
}
