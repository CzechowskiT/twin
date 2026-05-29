"use client";

import { useTranslation } from "@/components/language-provider";
import { JobFiltersBar } from "@/components/job-filters";
import { JobList } from "@/components/job-list";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/ux/empty-state";
import { defaultJobFilters, persistJobFilters, type JobFilters } from "@/lib/jobs";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";

import type { JobApplyActionsGuard } from "@/lib/job-apply-actions-guard";

import type {
  DashboardFeedStats,
  DashboardFilterOptions,
  DashboardJobList,
} from "./dashboard-helpers";

type EmployerJob = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url?: string;
  initialTab?: JobEmployerTabId;
};

type Props = {
  jobs: DashboardJobList | null;
  feedStats: DashboardFeedStats | null;
  filters: JobFilters;
  filterOptions: DashboardFilterOptions | null;
  hasProfile: boolean;
  displayApplicationStatus: Record<number, string>;
  autoApplyingId: number | null;
  applyActionsGuard: JobApplyActionsGuard;
  jobsLoadMoreBusy: boolean;
  onFiltersChange: (filters: JobFilters) => void;
  onApplyFilters: () => void;
  onLoadMore: () => void;
  setFilters: (filters: JobFilters) => void;
  onApply?: (jobId: number, url: string) => void;
  onAutoApply?: (jobId: number) => void;
  onSave?: (jobId: number) => void;
  onDismiss?: (jobId: number) => void;
  onResearch?: (id: number, title: string, company: string, location: string | null) => void;
  onHiringInsights?: (id: number, title: string) => void;
  onViewEmployer?: (job: EmployerJob) => void;
};

/**
 * Jobs feed card: feed-stats banner, filters bar, paginated job list,
 * load-more, and empty-state branches. Mirrors the previous inline block
 * 1:1 (same ids, classes, copy, callbacks gated by `hasProfile`).
 */
export function JobsSection({
  jobs,
  feedStats,
  filters,
  filterOptions,
  hasProfile,
  displayApplicationStatus,
  autoApplyingId,
  applyActionsGuard,
  jobsLoadMoreBusy,
  onFiltersChange,
  onApplyFilters,
  onLoadMore,
  setFilters,
  onApply,
  onAutoApply,
  onSave,
  onDismiss,
  onResearch,
  onHiringInsights,
  onViewEmployer,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card id="dashboard-jobs" variant="soft">
      <h2 className="twin-section-title mb-4">
        {t("dashboard.jobs")}
        {jobs !== null ? ` (${jobs.total})` : ""}
      </h2>
      {feedStats ? (
        <p className="twin-muted mb-2 text-xs leading-relaxed">
          {feedStats.market_update_label === "today"
            ? t("dashboard.marketLastUpdateToday")
            : feedStats.market_update_label === "yesterday"
              ? t("dashboard.marketLastUpdateYesterday")
              : feedStats.market_update_label === "older"
                ? t("dashboard.marketLastUpdateOlder")
                : t("dashboard.marketLastUpdateUnknown")}
        </p>
      ) : null}
      {feedStats?.feed_stale ? (
        <p
          className="mb-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          {t("dashboard.marketFeedStale")}
        </p>
      ) : null}
      <JobFiltersBar
        filters={filters}
        options={filterOptions}
        onChange={onFiltersChange}
        onApply={onApplyFilters}
      />
      {jobs === null ? (
        <div className="mt-3 space-y-3" aria-busy="true" aria-live="polite">
          <p className="twin-muted text-sm">{t("dashboard.jobsLoading")}</p>
          <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
        </div>
      ) : (
        <>
          {jobs.search_relaxed ? (
            <p
              className="mb-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              role="status"
            >
              {t("dashboard.jobsSearchRelaxedBanner")}
            </p>
          ) : null}
          {jobs.total > 0 ? (
            <p className="twin-muted mb-2 text-xs leading-relaxed">
              {t("dashboard.jobsShowingSummary")
                .replace("{shown}", String(jobs.items.length))
                .replace("{total}", String(jobs.total))}
            </p>
          ) : null}
          {jobs.total > 0 ? (
            <JobList
              items={jobs.items}
              showScore={hasProfile}
              applicationStatus={displayApplicationStatus}
              onApply={hasProfile ? onApply : undefined}
              onAutoApply={hasProfile ? onAutoApply : undefined}
              onResearch={
                hasProfile && onResearch
                  ? (id, title, company, location) => onResearch(id, title, company, location ?? null)
                  : undefined
              }
              onHiringInsights={
                hasProfile && onHiringInsights ? (id, title) => onHiringInsights(id, title) : undefined
              }
              onViewEmployer={
                hasProfile && onViewEmployer
                  ? (id, title, company, url, location) =>
                      onViewEmployer({
                        id,
                        title,
                        company,
                        location: location ?? null,
                        url,
                        initialTab: "partners",
                      })
                  : undefined
              }
              autoApplyJobId={autoApplyingId}
              applyActionsGuard={applyActionsGuard}
              onSave={hasProfile ? onSave : undefined}
              onDismiss={hasProfile ? onDismiss : undefined}
            />
          ) : null}
          {jobs.total > 0 && jobs.items.length < jobs.total ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={jobsLoadMoreBusy}
                onClick={onLoadMore}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {jobsLoadMoreBusy ? "…" : t("dashboard.jobsLoadMore")}
              </button>
            </div>
          ) : null}
          <p className="twin-muted mt-3 text-[11px] leading-relaxed">{t("dashboard.jobsCorpusNote")}</p>
        </>
      )}
      {jobs !== null && (jobs.total === 0 || jobs.items.length === 0) ? (
        <div className="mt-3">
          {!hasProfile ? (
            <EmptyState
              message={t("ux.jobsEmptyNoProfileMessage")}
              actionLabel={t("ux.jobsEmptyNoProfileCta")}
              actionHref="/profile"
            />
          ) : (
            <EmptyState
              message={t("ux.jobsEmptyMessage")}
              actionLabel={t("ux.jobsEmptyCta")}
              onAction={() => {
                setFilters(defaultJobFilters);
                persistJobFilters(defaultJobFilters);
              }}
            />
          )}
        </div>
      ) : null}
    </Card>
  );
}
