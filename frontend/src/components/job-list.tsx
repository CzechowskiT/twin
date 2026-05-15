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
  score?: number;
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
  onTrack,
}: {
  items: JobRow[];
  showScore?: boolean;
  applicationStatus?: Record<number, string>;
  onTrack?: (jobId: number) => void;
}) {
  const { t } = useTranslation();

  if (!items.length) {
    return <p className="twin-muted text-sm">{t("dashboard.noJobsFiltered")}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const jobId = item.job_id ?? item.id ?? 0;
        const key = jobId || item.url;
        const salary = formatSalary(item.salary_min, item.salary_max);
        const status = applicationStatus?.[jobId];

        return (
          <li key={key} className="twin-job-row flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 hover:no-underline"
            >
              <div className="flex flex-wrap items-start gap-2">
                {showScore && item.score != null && (
                  <span className="twin-badge shrink-0">{item.score}%</span>
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
            {onTrack && jobId > 0 && !status && (
              <button
                type="button"
                onClick={() => onTrack(jobId)}
                className="twin-btn-secondary twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs"
              >
                {t("dashboard.trackJob")}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
