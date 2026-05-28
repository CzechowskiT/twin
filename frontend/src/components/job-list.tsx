"use client";

import { RemotePercentageLabel } from "@/components/job/RemotePercentageLabel";
import { SeniorityBadge } from "@/components/job/SeniorityBadge";
import { TechStackIcons } from "@/components/job/TechStackIcons";
import { useTranslation } from "@/components/language-provider";
import { applicationDisplayStatusKey } from "@/lib/application-status";
import type { JobApplyActionsGuard } from "@/lib/job-apply-actions-guard";
import type { MatchBadgeId, MatchFeedbackValue, MatchQualityLabel } from "@/lib/matching-quality";
import type { TranslationKey } from "@/lib/i18n";

export type JobRow = {
  id?: number;
  job_id?: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
  source_label?: string | null;
  badges?: string[];
  score?: number | null;
  quality_label?: MatchQualityLabel | string | null;
  match_reason?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  tech_stack?: string[];
  seniority_level?: string | null;
  remote_percentage?: number | null;
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (min && max && min !== max) {
    return `${min.toLocaleString()}–${max.toLocaleString()} PLN`;
  }
  if (max) return `do ${max.toLocaleString()} PLN`;
  if (min) return `od ${min.toLocaleString()} PLN`;
  return null;
}

export function JobList({
  items,
  showScore = false,
  applicationStatus,
  onApply,
  onAutoApply,
  onResearch,
  onHiringInsights,
  onViewEmployer,
  onSave,
  onDismiss,
  autoApplyJobId,
  applyActionsGuard,
  matchFeedbackByJobId,
  onMatchFeedback,
  matchFeedbackBusyJobId,
}: {
  items: JobRow[];
  showScore?: boolean;
  applicationStatus?: Record<number, string>;
  onApply?: (jobId: number, url: string) => void;
  onAutoApply?: (jobId: number) => void;
  onResearch?: (jobId: number, title: string, company: string, location: string | null) => void;
  onHiringInsights?: (jobId: number, title: string) => void;
  onViewEmployer?: (
    jobId: number,
    title: string,
    company: string,
    url: string,
    location: string | null,
  ) => void;
  onSave?: (jobId: number) => void;
  onDismiss?: (jobId: number) => void;
  autoApplyJobId?: number | null;
  applyActionsGuard?: JobApplyActionsGuard;
  matchFeedbackByJobId?: Record<number, MatchFeedbackValue>;
  onMatchFeedback?: (jobId: number, value: MatchFeedbackValue) => void;
  matchFeedbackBusyJobId?: number | null;
}) {
  const { t } = useTranslation();

  const qualityKey = (label: string | null | undefined): TranslationKey | null => {
    const map: Record<string, TranslationKey> = {
      excellent: "dashboard.matchQualityExcellent",
      good: "dashboard.matchQualityGood",
      possible: "dashboard.matchQualityPossible",
      weak: "dashboard.matchQualityWeak",
    };
    return label && map[label] ? map[label] : null;
  };

  const badgeKey = (id: string): TranslationKey | null => {
    const map: Record<MatchBadgeId, TranslationKey> = {
      direct_employer: "dashboard.badgeDirectEmployer",
      fresh: "dashboard.badgeFresh",
      high_fit: "dashboard.badgeHighFit",
      remote: "dashboard.badgeRemote",
      salary_visible: "dashboard.badgeSalaryVisible",
    };
    return id in map ? map[id as MatchBadgeId] : null;
  };

  if (!items.length) {
    return <p className="twin-muted text-sm">{t("dashboard.noJobsFiltered")}</p>;
  }

  const hasActions = Boolean(onApply || onAutoApply || onResearch || onViewEmployer || onSave || onDismiss);

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const jobId = item.job_id ?? item.id ?? 0;
        const key = jobId || item.url;
        const salary = formatSalary(item.salary_min, item.salary_max);
        const status = applicationStatus?.[jobId];
        const confirmed = status === "external_submit_confirmed";
        const showActionRow =
          hasActions && jobId > 0 && !confirmed && status !== "rejected";

        return (
          <li key={key} className="twin-job-row flex flex-col gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 hover:no-underline"
            >
              <div className="flex flex-wrap items-start gap-2">
                {showScore && item.score != null && (
                  <span className="twin-badge shrink-0" title={t("dashboard.matchPercentTitle")}>
                    {Math.round(item.score)}%
                  </span>
                )}
                {showScore && qualityKey(item.quality_label ?? null) ? (
                  <span className="shrink-0 rounded bg-[var(--twin-surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--twin-muted-strong)]">
                    {t(qualityKey(item.quality_label)! )}
                  </span>
                ) : null}
                {(item.badges ?? []).map((badgeId) => {
                  const key = badgeKey(badgeId);
                  if (!key) return null;
                  return (
                    <span
                      key={badgeId}
                      className="shrink-0 rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-2 py-0.5 text-xs font-medium text-[var(--twin-muted-strong)]"
                    >
                      {t(key)}
                    </span>
                  );
                })}
                {status && (
                  <span className="shrink-0 rounded bg-[var(--twin-accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--twin-accent)]">
                    {t(applicationDisplayStatusKey(status, { display_status: status }))}
                  </span>
                )}
                <span className="twin-job-title min-w-0 flex-1">{item.title}</span>
              </div>
              <p className="twin-job-meta">
                {item.company}
                {item.location ? ` · ${item.location}` : ""}
                {salary ? ` · ${salary}` : ""}
                <span> · {item.source_label?.trim() || item.job_board}</span>
              </p>
              {item.match_reason?.trim() ? (
                <p className="twin-muted mt-1 text-xs leading-relaxed" title={t("dashboard.matchReasonTitle")}>
                  {item.match_reason.trim()}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SeniorityBadge level={item.seniority_level} />
                <RemotePercentageLabel pct={item.remote_percentage} />
                <TechStackIcons stack={item.tech_stack ?? []} max={4} />
              </div>
            </a>
            {showScore && onMatchFeedback && jobId > 0 ? (
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t("dashboard.matchFeedbackAria").replace("{title}", item.title)}
              >
                {(
                  [
                    ["apply_intent", "dashboard.matchFeedbackApplyIntent"],
                    ["relevant", "dashboard.matchFeedbackRelevant"],
                    ["not_relevant", "dashboard.matchFeedbackNotRelevant"],
                    ["not_now", "dashboard.matchFeedbackNotNow"],
                  ] as const
                ).map(([value, labelKey]) => {
                  const active = matchFeedbackByJobId?.[jobId] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={matchFeedbackBusyJobId === jobId}
                      onClick={() => onMatchFeedback(jobId, value)}
                      className={`twin-touch-target rounded-full border px-2.5 py-1 text-xs font-medium ${
                        active
                          ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]"
                          : "border-[var(--twin-border)] bg-[var(--twin-card)] text-[var(--twin-muted-strong)]"
                      }`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {showActionRow && (
              <div className="twin-job-actions">
                <div className="twin-job-actions__primary">
                  {onApply ? (
                    <button
                      type="button"
                      aria-label={`${t("dashboard.applyJob")}: ${item.title}, ${item.company}`}
                      onClick={() => onApply(jobId, item.url)}
                      className="twin-btn-solid twin-touch-target shrink-0 !w-auto"
                    >
                      {t("dashboard.applyJob")}
                    </button>
                  ) : null}
                  {onAutoApply ? (
                    <button
                      type="button"
                      aria-label={
                        applyActionsGuard?.canPrepareApplicationPackage
                          ? `${t("dashboard.prepareApplication")}: ${item.title}, ${item.company}`
                          : `${t("dashboard.prepareApplicationBlocked")}: ${item.title}, ${item.company}`
                      }
                      disabled={
                        autoApplyJobId === jobId || !applyActionsGuard?.canPrepareApplicationPackage
                      }
                      onClick={() => {
                        if (!applyActionsGuard?.canPrepareApplicationPackage) return;
                        onAutoApply(jobId);
                      }}
                      className={`twin-btn-secondary twin-touch-target shrink-0 !w-auto font-semibold ${
                        applyActionsGuard?.canPrepareApplicationPackage
                          ? "border-[var(--twin-cta)] text-[var(--twin-cta)]"
                          : "twin-btn--blocked"
                      }`}
                      title={
                        applyActionsGuard?.canPrepareApplicationPackage
                          ? t("dashboard.prepareApplicationHint")
                          : t("dashboard.prepareApplicationBlocked")
                      }
                    >
                      {autoApplyJobId === jobId
                        ? t("dashboard.prepareApplicationRunning")
                        : applyActionsGuard?.canPrepareApplicationPackage
                          ? t("dashboard.prepareApplication")
                          : t("dashboard.prepareApplicationBlocked")}
                    </button>
                  ) : null}
                </div>
                <div className="twin-job-actions__secondary">
                  {onResearch ? (
                    <button
                      type="button"
                      aria-label={`${t("careerAssistant.researchCompanyBrief")}: ${item.title}, ${item.company}`}
                      onClick={() => onResearch(jobId, item.title, item.company, item.location ?? null)}
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto"
                    >
                      {t("careerAssistant.researchCompanyBrief")}
                    </button>
                  ) : null}
                  {onHiringInsights ? (
                    <button
                      type="button"
                      aria-label={`${t("careerAssistant.hiringInsights")}: ${item.title}`}
                      onClick={() => onHiringInsights(jobId, item.title)}
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto"
                    >
                      {t("careerAssistant.hiringInsights")}
                    </button>
                  ) : null}
                  {onViewEmployer ? (
                    <button
                      type="button"
                      aria-label={`${t("jobEmployer.openEmployerHub")}: ${item.company}`}
                      onClick={() =>
                        onViewEmployer(jobId, item.title, item.company, item.url, item.location ?? null)
                      }
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto"
                    >
                      {t("jobEmployer.openEmployerHub")}
                    </button>
                  ) : null}
                  {onSave && !status ? (
                    <button
                      type="button"
                      aria-label={`${t("dashboard.saveJob")}: ${item.title}, ${item.company}`}
                      onClick={() => onSave(jobId)}
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto"
                    >
                      {t("dashboard.saveJob")}
                    </button>
                  ) : null}
                  {onDismiss ? (
                    <button
                      type="button"
                      aria-label={`${t("dashboard.dismissJob")}: ${item.title}, ${item.company}`}
                      onClick={() => onDismiss(jobId)}
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto opacity-80"
                    >
                      {t("dashboard.dismissJob")}
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
