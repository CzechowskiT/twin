"use client";

import { FormEvent } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Input, Label } from "@/components/ui";
import type { JobSearchFilters } from "@/lib/career/job-types";

export function JobFilters({
  filters,
  onChange,
  onParseNl,
  nlQuery,
  onNlChange,
}: {
  filters: JobSearchFilters;
  onChange: (next: JobSearchFilters) => void;
  onParseNl: (query: string) => void;
  nlQuery: string;
  onNlChange: (query: string) => void;
}) {
  const { t } = useTranslation();

  function set<K extends keyof JobSearchFilters>(key: K, value: JobSearchFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onParseNl(nlQuery);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("careerDiscovery.filtersTitle")}</h3>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={nlQuery}
          onChange={(e) => onNlChange(e.target.value)}
          placeholder={t("careerDiscovery.naturalLanguagePlaceholder")}
        />
        <ButtonChip type="submit">{t("careerDiscovery.applyNl")}</ButtonChip>
      </form>
      <div>
        <Label>{t("dashboard.filterSearch")}</Label>
        <Input value={filters.q} onChange={(e) => set("q", e.target.value)} />
      </div>
      <div>
        <Label>{t("careerDiscovery.department")}</Label>
        <Input
          value={filters.department}
          onChange={(e) => set("department", e.target.value)}
        />
      </div>
      <div>
        <Label>{t("careerDiscovery.workFormat")}</Label>
        <Input
          value={filters.workFormat}
          onChange={(e) => set("workFormat", e.target.value)}
        />
      </div>
      <div>
        <Label>{t("careerDiscovery.seniority")}</Label>
        <Input
          value={filters.seniority}
          onChange={(e) => set("seniority", e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonChip
          type="button"
          onClick={() => set("sort", "match")}
          className={filters.sort === "match" ? "twin-btn-chip--active" : ""}
        >
          {t("careerDiscovery.sortMatch")}
        </ButtonChip>
      </div>
    </div>
  );
}
