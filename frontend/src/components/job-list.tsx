"use client";

import { useTranslation } from "@/components/language-provider";
import { applicationStatusKey } from "@/lib/application-status";

export type JobRow = {
  id?: number;
  job_id?: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
  score?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
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
  onSave,
  onDismiss,
  autoApplyJobId,
}: {
  items: JobRow[];
  showScore?: boolean;
  applicationStatus?: Record<number, string>;
  onApply?: (jobId: number, url: string) => void;
  onAutoApply?: (jobId: number) => void;
  onSave?: (jobId: number) => void;
  onDismiss?: (jobId: number) => void;
  autoApplyJobId?: number | null;
}) {
  const { t } = useTranslation();

  if (!items.length) {
    return <p className="twin-muted text-sm">{t("dashboard.noJobsFiltered")}</p>;
  }

  const hasActions = Boolean(onApply || onAutoApply || onSave || onDismiss);

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const jobId = item.job_id ?? item.id ?? 0;
        const key = jobId || item.url;
        const salary = formatSalary(item.salary_min, item.salary_max);
        const status = applicationStatus?.[jobId];
        const showActionRow =
          hasActions && jobId > 0 && status !== "applied" && status !== "rejected";

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
                {status && (
                  <span className="shrink-0 rounded bg-[var(--twin-accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--twin-accent)]">
                    {t(applicationStatusKey(status))}
                  </span>
                )}
                <span className="twin-job-title min-w-0 flex-1">{item.title}</span>
              </div>
              <p className="twin-job-meta">
                {item.company}
                {item.location ? ` · ${item.location}` : ""}
                {salary ? ` · ${salary}` : ""}
                <span> · {item.job_board}</span>
              </p>
            </a>
            {showActionRow && (
              <div className="flex flex-wrap gap-2">
                {onApply && (
                  <button
                    type="button"
                    onClick={() => onApply(jobId, item.url)}
                    className="twin-btn-solid twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs"
                  >
                    {t("dashboard.applyJob")}
                  </button>
                )}
                {onAutoApply && (
                  <button
                    type="button"
                    disabled={autoApplyJobId === jobId}
                    onClick={() => onAutoApply(jobId)}
                    className="twin-btn-secondary twin-touch-target shrink-0 !w-auto border-[var(--twin-cta)] px-3 py-1.5 text-xs font-semibold text-[var(--twin-cta)]"
                    title={t("dashboard.autoApplyHint")}
                  >
                    {autoApplyJobId === jobId ? t("dashboard.autoApplyRunning") : t("dashboard.autoApplyJob")}
                  </button>
                )}
                {onSave && !status && (
                  <button
                    type="button"
                    onClick={() => onSave(jobId)}
                    className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs"
                  >
                    {t("dashboard.saveJob")}
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={() => onDismiss(jobId)}
                    className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs opacity-80"
                  >
                    {t("dashboard.dismissJob")}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
