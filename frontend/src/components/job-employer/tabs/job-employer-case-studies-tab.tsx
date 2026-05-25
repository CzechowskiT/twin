"use client";

import { useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import {
  CASE_STUDIES_HERO_STATS,
  CASE_STUDY_INDUSTRY_FILTERS,
  CASE_STUDY_OPEN_ROLES,
  CASE_STUDY_PDFS,
  CASE_STUDY_REGION_FILTERS,
  CASE_STUDY_VIDEOS,
  EMPLOYEE_SPOTLIGHTS,
  FEATURED_CASE_STUDIES,
  HIRING_FUNNEL_STAGES,
  type CaseStudyIndustryFilter,
  type CaseStudyRegionFilter,
} from "@/lib/job-employer-case-studies-demo";
import type { JOB_EMPLOYER_MESSAGES_EN } from "@/lib/job-employer-messages";

type MsgKey = keyof typeof JOB_EMPLOYER_MESSAGES_EN;

const REGION_LABEL: Record<CaseStudyRegionFilter, MsgKey> = {
  all: "caseStudiesFilterAll",
  emea: "caseStudiesFilterEmea",
  americas: "caseStudiesFilterAmericas",
  apac: "caseStudiesFilterApac",
};

const INDUSTRY_LABEL: Record<CaseStudyIndustryFilter, MsgKey> = {
  all: "caseStudiesFilterAll",
  tech: "caseStudiesFilterTech",
  finance: "caseStudiesFilterFinance",
  retail: "caseStudiesFilterRetail",
  manufacturing: "caseStudiesFilterManufacturing",
};

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`twin-touch-target rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] text-[var(--twin-accent-hover)]"
          : "border-[var(--twin-border)] text-[var(--twin-muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

export function JobEmployerCaseStudiesTab({ company }: { company: string }) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<CaseStudyRegionFilter>("all");
  const [industry, setIndustry] = useState<CaseStudyIndustryFilter>("all");

  const lead = t("jobEmployer.caseStudiesLead").replace("{company}", company);

  const featured = useMemo(
    () =>
      FEATURED_CASE_STUDIES.filter((cs) => {
        const regionOk = region === "all" || cs.region === region;
        const industryOk = industry === "all" || cs.industry === industry;
        return regionOk && industryOk;
      }),
    [region, industry],
  );

  const je = (key: MsgKey) => t(`jobEmployer.${key}`);

  return (
    <div className="space-y-10 pb-2">
      <p className="demo-sample-banner text-xs leading-relaxed">
        {t("jobEmployer.demoDisclaimer")}
      </p>

      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {je("caseStudiesEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {je("caseStudiesTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{lead}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CASE_STUDIES_HERO_STATS.map((stat) => (
          <li key={stat.id}>
            <Card className="!mb-0 p-4 text-center" variant="soft">
              <p className="text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted)]">{je(stat.labelKey as MsgKey)}</p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {je("caseStudiesFilterRegion")}:
          </span>
          {CASE_STUDY_REGION_FILTERS.map((id) => (
            <FilterChip
              key={id}
              label={je(REGION_LABEL[id])}
              selected={region === id}
              onClick={() => setRegion(id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {je("caseStudiesFilterIndustry")}:
          </span>
          {CASE_STUDY_INDUSTRY_FILTERS.map((id) => (
            <FilterChip
              key={id}
              label={je(INDUSTRY_LABEL[id])}
              selected={industry === id}
              onClick={() => setIndustry(id)}
            />
          ))}
        </div>
      </div>

      <EmployerTabSection title={je("caseStudiesFeaturedTitle")} lead={je("caseStudiesFeaturedLead")}>
        {featured.length === 0 ? (
          <p className="text-sm text-[var(--twin-muted)]">{je("caseStudiesFilterAll")} — adjust filters (demo).</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {featured.map((cs) => (
              <li key={cs.id}>
                <Card className="!mb-0 flex h-full flex-col p-4" variant="soft">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{je(cs.titleKey as MsgKey)}</p>
                  <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                        {je("caseStudiesChallenge")}
                      </p>
                      <p className="mt-1 leading-relaxed text-[var(--twin-muted-strong)]">
                        {je(cs.challengeKey as MsgKey)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                        {je("caseStudiesSolution")}
                      </p>
                      <p className="mt-1 leading-relaxed text-[var(--twin-muted-strong)]">
                        {je(cs.solutionKey as MsgKey)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                        {je("caseStudiesResults")}
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {cs.resultKeys.map((rk) => (
                          <li
                            key={rk}
                            className="rounded-md border border-[var(--twin-border)] px-2 py-0.5 font-medium text-[var(--twin-accent)]"
                          >
                            {je(rk as MsgKey)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </EmployerTabSection>

      <EmployerTabSection title={je("caseStudiesSpotlightsTitle")} lead={je("caseStudiesSpotlightsLead")}>
        <ul className="grid gap-3 md:grid-cols-3">
          {EMPLOYEE_SPOTLIGHTS.map((person) => (
            <li key={person.id}>
              <blockquote className="h-full rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4">
                <p className="text-sm italic leading-relaxed text-[var(--twin-muted-strong)]">
                  &ldquo;{je(person.quoteKey as MsgKey)}&rdquo;
                </p>
                <footer className="mt-3 text-xs">
                  <p className="font-semibold text-[var(--foreground)]">{person.name}</p>
                  <p className="text-[var(--twin-muted)]">
                    {person.role} · {person.region}
                  </p>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={je("caseStudiesFunnelTitle")} lead={je("caseStudiesFunnelLead")}>
        <div className="overflow-x-auto">
          <div className="min-w-[32rem] grid-cols-5 gap-2 sm:grid">
            {HIRING_FUNNEL_STAGES.map((stage) => (
              <div key={stage.id} className="space-y-2 p-2">
                <p className="text-center text-xs font-semibold text-[var(--foreground)]">
                  {je(stage.labelKey as MsgKey)}
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] uppercase text-[var(--twin-muted)]">{je("caseStudiesFunnelBefore")}</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--twin-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--twin-muted)]"
                        style={{ width: `${stage.beforePct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs tabular-nums text-[var(--twin-muted)]">{stage.beforePct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[var(--twin-accent)]">{je("caseStudiesFunnelAfter")}</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--twin-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--twin-accent)]"
                        style={{ width: `${stage.afterPct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs tabular-nums text-[var(--twin-accent)]">{stage.afterPct}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </EmployerTabSection>

      <Card className="!mb-0 border-[var(--twin-accent)]/30 p-5" variant="accent">
        <EmployerTabSection title={je("caseStudiesTwinTitle")} lead={je("caseStudiesTwinLead")}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(["caseStudiesTwinB1", "caseStudiesTwinB2", "caseStudiesTwinB3", "caseStudiesTwinB4"] as const).map(
              (key) => (
                <li key={key} className="flex gap-2 text-sm text-[var(--twin-muted-strong)]">
                  <span className="text-[var(--twin-accent)]" aria-hidden>
                    ✓
                  </span>
                  {je(key)}
                </li>
              ),
            )}
          </ul>
          <button type="button" className="twin-btn-solid twin-touch-target mt-4 !w-auto px-5 text-sm">
            {je("caseStudiesTwinCta")}
          </button>
        </EmployerTabSection>
      </Card>

      <EmployerTabSection title={je("caseStudiesPdfsTitle")} lead={je("caseStudiesPdfsLead")}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {CASE_STUDY_PDFS.map((pdf) => (
            <li key={pdf.id}>
              <Card className="!mb-0 flex h-full flex-col p-4" variant="soft">
                <p className="text-sm font-semibold">{je(pdf.titleKey as MsgKey)}</p>
                <p className="mt-1 text-xs text-[var(--twin-muted)]">
                  {pdf.pages} pp · {pdf.sizeLabel}
                </p>
                <button type="button" className="twin-link mt-auto pt-3 text-left text-xs font-medium">
                  {je("caseStudiesPdfDownload")} →
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={je("caseStudiesVideosTitle")} lead={je("caseStudiesVideosLead")}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {CASE_STUDY_VIDEOS.map((video) => (
            <li key={video.id}>
              <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-[var(--twin-border)] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 text-center">
                <span className="text-3xl opacity-60" aria-hidden>
                  ▶
                </span>
                <p className="mt-2 text-sm font-semibold text-white/90">{je(video.titleKey as MsgKey)}</p>
                <p className="mt-1 text-xs text-white/60">{je(video.speakerKey as MsgKey)}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-white/50">
                  {video.durationMin} min · {je("caseStudiesVideoPlay")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={je("caseStudiesRolesTitle")} lead={je("caseStudiesRolesLead")}>
        <ul className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {CASE_STUDY_OPEN_ROLES.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{role.title}</p>
                <p className="text-xs text-[var(--twin-muted)]">
                  {role.team} · {role.location}
                </p>
              </div>
              <span className="text-xs text-[var(--twin-muted)]">
                {je("caseStudiesRolesPosted").replace("{when}", role.posted)}
              </span>
            </li>
          ))}
        </ul>
      </EmployerTabSection>
    </div>
  );
}
