"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { JobList } from "@/components/job-list";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import type { DashboardMatchList } from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import {
  CANDIDATE_MATCHES_PAGE_MARKER,
  CANDIDATE_MATCHES_PILOT_ITEMS,
  CANDIDATE_MATCHES_PILOT_MISSING,
} from "@/lib/candidate-offers-matches-demo-data";
import { dashboardMatchesQuery } from "@/lib/matching-quality";

export function CandidateMatchesWorkspace() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<DashboardMatchList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<DashboardMatchList>(dashboardMatchesQuery(), {}, token);
      setMatches(data);
    } catch {
      setError(t("jobBoard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const liveItems = matches?.items ?? [];
  const showPilot = !loading && liveItems.length === 0;
  const displayItems = showPilot ? CANDIDATE_MATCHES_PILOT_ITEMS : liveItems;

  const pageTitle = useMemo(() => t("candidateMatchesPage.pageTitle"), [t]);

  return (
    <Shell wide rail>
      <div data-candidate-matches-page={CANDIDATE_MATCHES_PAGE_MARKER} className="space-y-6">
        <header className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("candidateMatchesPage.pageEyebrow")}
          </p>
          <h1 className="twin-section-title mt-2 text-xl sm:text-2xl">{pageTitle}</h1>
          <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t("candidateMatchesPage.pageLead")}</p>
          <Link href={CANDIDATE_CANONICAL_ROUTES.panel} className="twin-muted mt-2 inline-block text-xs underline">
            {t("candidateMatchesPage.backToPanel")}
          </Link>
        </header>

        <CandidateWorkspaceSubnav ariaLabel={pageTitle} />
        <WorkspaceFlowSteps current="matches" className="mb-2" />

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {loading ? <p className="twin-muted text-sm">{t("dashboard.matchesLoading")}</p> : null}

        {showPilot ? (
          <Card variant="soft" className="border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-semibold text-amber-200">{t("candidateMatchesPage.pilotBadge")}</p>
            <p className="mt-2 text-[var(--twin-muted-strong)]">{t("candidateMatchesPage.pilotLead")}</p>
            <ul className="mt-3 list-inside list-disc text-[var(--twin-fg)]">
              {CANDIDATE_MATCHES_PILOT_MISSING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {!loading && displayItems.length > 0 ? (
          <Card variant="soft" className="p-5 sm:p-6">
            <JobList items={displayItems} showScore />
            <p className="twin-muted mt-4 text-xs leading-relaxed">{t("candidateMatchesPage.decisionBoundary")}</p>
          </Card>
        ) : null}

        {!loading && !showPilot && displayItems.length === 0 ? (
          <GuidedEmptyState
            title={t("candidateMatchesPage.emptyTitle")}
            message={t("candidateMatchesPage.emptyMessage")}
            steps={[
              t("candidateMatchesPage.emptyStep1"),
              t("candidateMatchesPage.emptyStep2"),
              t("candidateMatchesPage.emptyStep3"),
            ]}
            actionLabel={t("candidateMatchesPage.emptyCtaProfile")}
            actionHref={CANDIDATE_CANONICAL_ROUTES.profile}
          />
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link href={CANDIDATE_CANONICAL_ROUTES.jobs} className="twin-btn-secondary twin-touch-target">
            {t("candidateMatchesPage.ctaOffers")}
          </Link>
          <Link href={CANDIDATE_CANONICAL_ROUTES.profile} className="twin-btn-secondary twin-touch-target">
            {t("workspaceModules.candidateProfileCta")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}
