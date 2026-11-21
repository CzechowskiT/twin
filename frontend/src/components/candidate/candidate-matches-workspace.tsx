"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActivationMatchingStatus, type ActivationStatus } from "@/components/candidate/activation-matching-status";
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
import { WorkspaceHandoffBanner, startWorkspaceHandoff } from "@/components/candidate/workspace-handoff-banner";
import { useRouter } from "next/navigation";
import { CANDIDATE_MATCHES_PAGE_MARKER } from "@/lib/candidate-offers-matches-demo-data";
import { ACTIVATION_MATCHING_STATUS_ENABLED } from "@/lib/features";
import { dashboardMatchesQuery } from "@/lib/matching-quality";

export function CandidateMatchesWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activated = searchParams.get("activated") === "1";
  const [matches, setMatches] = useState<DashboardMatchList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadMatches = useCallback(async () => {
    const id = ++requestId.current;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<DashboardMatchList>(dashboardMatchesQuery(), {}, token);
      if (id === requestId.current) {
        setMatches(data);
        setError(null);
      }
    } catch {
      if (id === requestId.current) setError(t("jobBoard.loadError"));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void loadMatches();
    });
    return () => { mounted = false; };
  }, [loadMatches]);

  const onStatusChange = useCallback((status: ActivationStatus | null) => {
    if (status?.status === "completed") void loadMatches();
  }, [loadMatches]);

  const liveItems = matches?.items ?? [];
  const pageTitle = t("candidateMatchesPage.pageTitle");

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
          <WorkspaceHandoffBanner expectedDestRouteKey="matches" />
        </header>

        <CandidateWorkspaceSubnav ariaLabel={pageTitle} />
        {liveItems[0] && "id" in (liveItems[0] as object) ? (
          <button
            type="button"
            className="twin-link text-sm underline"
            data-workspace-handoff-cta="opportunity_to_app_studio"
            onClick={() => {
              const id = String((liveItems[0] as { id?: number | string }).id || "");
              if (!id) return;
              void (async () => {
                const url = await startWorkspaceHandoff({
                  handoffId: "opportunity_to_app_studio",
                  objectRef: id,
                });
                if (url) router.push(url);
              })();
            }}
          >
            {t("handoff.startHandoff")}
          </button>
        ) : null}
        <WorkspaceFlowSteps current="matches" className="mb-2" />

        <ActivationMatchingStatus
          activated={activated}
          matchCount={matches && !error ? liveItems.length : null}
          onStatusChange={onStatusChange}
        />

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {loading ? <p className="twin-muted text-sm">{t("dashboard.matchesLoading")}</p> : null}

        {!loading && liveItems.length > 0 ? (
          <Card variant="soft" className="p-5 sm:p-6">
            <JobList items={liveItems} showScore />
            <p className="twin-muted mt-4 text-xs leading-relaxed">{t("candidateMatchesPage.decisionBoundary")}</p>
          </Card>
        ) : null}

        {!loading && !error && liveItems.length === 0 && !(activated && ACTIVATION_MATCHING_STATUS_ENABLED) ? (
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
