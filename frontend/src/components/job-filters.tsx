"use client";

import { useTranslation } from "@/components/language-provider";
import type { JobFilters } from "@/lib/jobs";

type Options = { job_boards: string[]; locations: string[] };

export function JobFiltersBar({
  filters,
  options,
  onChange,
  onApply,
}: {
  filters: JobFilters;
  options: Options | null;
  onChange: (next: JobFilters) => void;
  onApply: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="twin-filter-box mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterSearch")}
          </span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            placeholder={t("dashboard.filterSearchPlaceholder")}
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterTitleTerms")}
          </span>
          <input
            type="text"
            value={filters.title_terms}
            onChange={(e) => onChange({ ...filters, title_terms: e.target.value })}
            placeholder={t("dashboard.filterTitlePlaceholder")}
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterLocation")}
          </span>
          <select
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
          >
            <option value="">{t("dashboard.filterAll")}</option>
            {options?.locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterBoard")}
          </span>
          <select
            value={filters.job_board}
            onChange={(e) => onChange({ ...filters, job_board: e.target.value })}
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
          >
            <option value="">{t("dashboard.filterAll")}</option>
            {options?.job_boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterMinSalary")}
          </span>
          <input
            type="number"
            min={0}
            step={500}
            value={filters.min_salary}
            onChange={(e) => onChange({ ...filters, min_salary: e.target.value })}
            placeholder="15000"
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--twin-muted-strong)]">
            {t("dashboard.filterSort")}
          </span>
          <select
            value={filters.sort}
            onChange={(e) =>
              onChange({ ...filters, sort: e.target.value as JobFilters["sort"] })
            }
            className="twin-touch-target w-full rounded border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm"
          >
            <option value="newest">{t("dashboard.sortNewest")}</option>
            <option value="salary">{t("dashboard.sortSalary")}</option>
            <option value="company">{t("dashboard.sortCompany")}</option>
          </select>
        </label>
      </div>
      <button type="button" onClick={onApply} className="twin-btn-solid twin-touch-target !w-full sm:!w-auto">
        {t("dashboard.filterApply")}
      </button>
    </div>
  );
}
