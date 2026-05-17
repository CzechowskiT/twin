"use client";

import { useTranslation } from "@/components/language-provider";
import { applicationStatusKey } from "@/lib/application-status";

export type ApplicationRow = {
  id: number;
  job_id: number;
  status: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
};

const STATUSES = ["pending", "applied", "interview", "rejected", "hired"] as const;

function normalizeApplicationSelectStatus(status: string): (typeof STATUSES)[number] {
  const s = status.trim().toLowerCase();
  return (STATUSES as readonly string[]).includes(s) ? (s as (typeof STATUSES)[number]) : "pending";
}

export function ApplicationsPanel({
  items,
  onStatusChange,
  onRemove,
}: {
  items: ApplicationRow[];
  onStatusChange: (id: number, status: string) => void;
  onRemove: (id: number) => void;
}) {
  const { t } = useTranslation();

  if (!items.length) {
    return <p className="twin-muted text-sm">{t("dashboard.noApplications")}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((app) => (
        <li
          key={app.id}
          className="twin-card-inset flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <a href={app.url} target="_blank" rel="noopener noreferrer" className="twin-link font-medium">
              {app.title}
            </a>
            <p className="twin-muted mt-0.5 text-xs">
              {app.company}
              {app.location ? ` · ${app.location}` : ""} · {app.job_board}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={normalizeApplicationSelectStatus(app.status)}
              onChange={(e) => onStatusChange(app.id, e.target.value)}
              className="rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-2 py-1 text-xs"
              aria-label={t("dashboard.applicationStatus")}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(applicationStatusKey(s))}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(app.id)}
              className="text-xs text-red-600 hover:underline"
            >
              {t("dashboard.removeApplication")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
