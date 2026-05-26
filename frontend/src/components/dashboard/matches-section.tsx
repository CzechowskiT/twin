"use client";

import { useTranslation } from "@/components/language-provider";
import { JobList } from "@/components/job-list";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/ux/empty-state";
import { TOP_MATCHES_HIGHLIGHT_COUNT, type MatchFeedbackValue } from "@/lib/matching-quality";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

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

/**
 * Ranked-feed section: skeleton on initial load, then the "apply now?"
 * prompt + top highlight matches + secondary "more recommendations" group.
 * Feedback / apply / save / dismiss handlers are all owned by the parent
 * page so the "Nietrafione" feedback flow is preserved verbatim.
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
  const { t } = useTranslation();

  if (!matchesInitialSkeleton && matches === null) return null;

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
              <p className="twin-muted mt-1 text-sm">{t("dashboard.rankedFeedLead")}</p>
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
              <section aria-labelledby="dashboard-top-matches-heading">
                <h3 id="dashboard-top-matches-heading" className="text-base font-semibold text-[var(--foreground)]">
                  {t("dashboard.topMatchesSection")} ({topHighlightMatches.length})
                </h3>
                <p className="twin-muted mt-1 text-sm">{t("dashboard.topMatchesLead")}</p>
                <div className="mt-3">
                  <JobList
                    items={topHighlightMatches}
                    showScore
                    matchFeedbackByJobId={matchFeedbackByJobId}
                    onMatchFeedback={(jobId, value) => onSubmitFeedback(jobId, value)}
                    matchFeedbackBusyJobId={matchFeedbackBusyJobId}
                    applicationStatus={displayApplicationStatus}
                    onApply={onApply}
                    onAutoApply={onAutoApply}
                    onResearch={(id, title, company, location) =>
                      onResearch(id, title, company, location ?? null)
                    }
                    onHiringInsights={(id, title) => onHiringInsights(id, title)}
                    onViewEmployer={(id, title, company, url, location) =>
                      onViewEmployer({
                        id,
                        title,
                        company,
                        location: location ?? null,
                        url,
                        initialTab: "partners",
                      })
                    }
                    autoApplyJobId={autoApplyingId}
                    onSave={onSave}
                    onDismiss={onDismiss}
                  />
                </div>
              </section>
              {moreRecommendationMatches.length > 0 ? (
                <section aria-labelledby="dashboard-more-matches-heading">
                  <h3
                    id="dashboard-more-matches-heading"
                    className="text-base font-semibold text-[var(--foreground)]"
                  >
                    {t("dashboard.moreRecommendationsSection")} ({moreRecommendationMatches.length})
                  </h3>
                  <p className="twin-muted mt-1 text-sm">{t("dashboard.moreRecommendationsLead")}</p>
                  <div className="mt-3">
                    <JobList
                      items={moreRecommendationMatches}
                      showScore
                      matchFeedbackByJobId={matchFeedbackByJobId}
                      onMatchFeedback={(jobId, value) => onSubmitFeedback(jobId, value)}
                      matchFeedbackBusyJobId={matchFeedbackBusyJobId}
                      applicationStatus={displayApplicationStatus}
                      onApply={onApply}
                      onAutoApply={onAutoApply}
                      onResearch={(id, title, company, location) =>
                        onResearch(id, title, company, location ?? null)
                      }
                      onHiringInsights={(id, title) => onHiringInsights(id, title)}
                      onViewEmployer={(id, title, company, url, location) =>
                        onViewEmployer({
                          id,
                          title,
                          company,
                          location: location ?? null,
                          url,
                          initialTab: "partners",
                        })
                      }
                      autoApplyJobId={autoApplyingId}
                      onSave={onSave}
                      onDismiss={onDismiss}
                    />
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export { TOP_MATCHES_HIGHLIGHT_COUNT };
