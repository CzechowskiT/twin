"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { JobList } from "@/components/job-list";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/ux/empty-state";
import {
  groupMatchesByConfidence,
  type MatchConfidenceGroupId,
} from "@/lib/match-quality-groups";
import { TOP_MATCHES_HIGHLIGHT_COUNT, type MatchFeedbackValue } from "@/lib/matching-quality";
import type { TranslationKey } from "@/lib/i18n";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

import type { JobApplyActionsGuard } from "@/lib/job-apply-actions-guard";

import type { DashboardMatchItem } from "./dashboard-helpers";

type EmployerJob = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url?: string;
  initialTab?: JobEmployerTabId;
};

type Props = {
  matches: { items: DashboardMatchItem[]; total: number } | null;
  matchesInitialSkeleton: boolean;
  visibleMatches: DashboardMatchItem[];
  topHighlightMatches: DashboardMatchItem[];
  moreRecommendationMatches: DashboardMatchItem[];
  matchFeedbackByJobId: Record<number, MatchFeedbackValue>;
  matchFeedbackBusyJobId: number | null;
  displayApplicationStatus: Record<number, string>;
  autoApplyingId: number | null;
  applyActionsGuard: JobApplyActionsGuard;
  matchesCsvBusy: boolean;
  matchesXlsxBusy: boolean;
  showApplyPrompt: boolean;
  onSubmitFeedback: (jobId: number, value: MatchFeedbackValue) => void;
  onApply: (jobId: number, url: string) => void;
  onAutoApply: (jobId: number) => void;
  onSave: (jobId: number) => void;
  onDismiss: (jobId: number) => void;
  onResearch: (id: number, title: string, company: string, location: string | null) => void;
  onHiringInsights: (id: number, title: string) => void;
  onViewEmployer: (job: EmployerJob) => void;
  onDownloadCsv: () => void;
  onDownloadXlsx: () => void;
  onApplyPromptDismiss: () => void;
  onApplyPromptOpenFirst: () => void;
};

const GROUP_META: Record<
  MatchConfidenceGroupId,
  { titleKey: TranslationKey; leadKey: TranslationKey; chipKey: TranslationKey }
> = {
  strong_fit: {
    titleKey: "dashboard.matchGroupStrongFit",
    leadKey: "dashboard.matchGroupStrongFitLead",
    chipKey: "dashboard.matchGroupConfidenceHigh",
  },
  worth_reviewing: {
    titleKey: "dashboard.matchGroupWorthReviewing",
    leadKey: "dashboard.matchGroupWorthReviewingLead",
    chipKey: "dashboard.matchGroupReviewCarefully",
  },
  low_confidence: {
    titleKey: "dashboard.matchGroupLowConfidence",
    leadKey: "dashboard.matchGroupLowConfidenceLead",
    chipKey: "dashboard.matchGroupUncertainty",
  },
};

/**
 * Ranked-feed section grouped by match confidence: Strong fit / Worth reviewing / Low confidence.
 */
export function MatchesSection({
  matches,
  matchesInitialSkeleton,
  visibleMatches,
  topHighlightMatches,
  moreRecommendationMatches,
  matchFeedbackByJobId,
  matchFeedbackBusyJobId,
  displayApplicationStatus,
  autoApplyingId,
  applyActionsGuard,
  matchesCsvBusy,
  matchesXlsxBusy,
  showApplyPrompt,
  onSubmitFeedback,
  onApply,
  onAutoApply,
  onSave,
  onDismiss,
  onResearch,
  onHiringInsights,
  onViewEmployer,
  onDownloadCsv,
  onDownloadXlsx,
  onApplyPromptDismiss,
  onApplyPromptOpenFirst,
}: Props) {
  void topHighlightMatches;
  void moreRecommendationMatches;
  const { t } = useTranslation();
  const confidenceGroups = useMemo(
    () => groupMatchesByConfidence(visibleMatches),
    [visibleMatches],
  );

  if (!matchesInitialSkeleton && matches === null) return null;

  const jobListProps = {
    showScore: true as const,
    matchFeedbackByJobId,
    onMatchFeedback: (jobId: number, value: MatchFeedbackValue) => onSubmitFeedback(jobId, value),
    matchFeedbackBusyJobId,
    applicationStatus: displayApplicationStatus,
    onApply,
    onAutoApply,
    onResearch: (id: number, title: string, company: string, location: string | null) =>
      onResearch(id, title, company, location ?? null),
    onHiringInsights: (id: number, title: string) => onHiringInsights(id, title),
    onViewEmployer: (id: number, title: string, company: string, url: string, location: string | null) =>
      onViewEmployer({
        id,
        title,
        company,
        location: location ?? null,
        url,
        initialTab: "partners",
      }),
    autoApplyJobId: autoApplyingId,
    applyActionsGuard,
    onSave,
    onDismiss,
  };

  return (
    <Card id="dashboard-matches" variant="soft">
      {matchesInitialSkeleton ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <p className="twin-muted text-sm">{t("dashboard.matchesLoading")}</p>
          <div className="h-8 w-56 max-w-full animate-pulse rounded bg-[var(--twin-border)]" />
          <div className="h-28 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
          <div className="h-28 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
        </div>
      ) : (
        <>
          {showApplyPrompt && visibleMatches.length > 0 ? (
            <div className="mb-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/80 p-4 shadow-sm">
              <p className="text-sm font-semibold text-[var(--twin-accent-hover)]">{t("dashboard.applyPromptTitle")}</p>
              <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.applyPromptLead")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="twin-btn-solid twin-touch-target !min-h-[2.5rem] px-4 text-sm"
                  onClick={onApplyPromptOpenFirst}
                >
                  {t("dashboard.applyPromptYes")}
                </button>
                <button
                  type="button"
                  className="twin-btn-secondary twin-touch-target !min-h-[2.5rem] px-4 text-sm"
                  onClick={onApplyPromptDismiss}
                >
                  {t("dashboard.applyPromptNo")}
                </button>
                <button
                  type="button"
                  className="twin-touch-target rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-4 py-2 text-sm font-medium text-[var(--twin-muted-strong)]"
                  onClick={onApplyPromptDismiss}
                >
                  {t("dashboard.applyPromptLater")}
                </button>
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="twin-section-title">
                {t("dashboard.rankedFeedTitle")} ({visibleMatches.length})
              </h2>
              <p className="twin-muted mt-1 text-sm">{t("dashboard.rankedFeedLeadGrouped")}</p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto sm:shrink-0">
              <button
                type="button"
                aria-label={t("dashboard.matchesExportCsv")}
                disabled={matchesCsvBusy || matchesXlsxBusy}
                onClick={onDownloadCsv}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {matchesCsvBusy ? "…" : t("dashboard.matchesExportCsv")}
              </button>
              <button
                type="button"
                aria-label={t("dashboard.matchesExportXlsxAria")}
                disabled={matchesCsvBusy || matchesXlsxBusy}
                onClick={onDownloadXlsx}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {matchesXlsxBusy ? "…" : t("dashboard.matchesExportXlsx")}
              </button>
            </div>
          </div>
          {visibleMatches.length === 0 ? (
            <EmptyState
              message={t("ux.matchesEmptyMessage")}
              actionLabel={t("ux.matchesEmptyCta")}
              actionHref="/profile"
            />
          ) : (
            <div className="space-y-8">
              {confidenceGroups.map((group) => {
                const meta = GROUP_META[group.id];
                const headingId = `dashboard-match-group-${group.id}`;
                return (
                  <section key={group.id} aria-labelledby={headingId}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id={headingId} className="text-base font-semibold text-[var(--foreground)]">
                        {t(meta.titleKey)} ({group.items.length})
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          group.id === "strong_fit"
                            ? "border border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]/40 text-[var(--twin-accent-hover)]"
                            : group.id === "worth_reviewing"
                              ? "border border-[var(--twin-border)] bg-[var(--twin-surface-2)] text-[var(--twin-muted-strong)]"
                              : "border border-dashed border-[var(--twin-border)] text-[var(--twin-muted)]"
                        }`}
                      >
                        {t(meta.chipKey)}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-sm">{t(meta.leadKey)}</p>
                    <div className="mt-3">
                      <JobList items={group.items} {...jobListProps} />
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export { TOP_MATCHES_HIGHLIGHT_COUNT };
