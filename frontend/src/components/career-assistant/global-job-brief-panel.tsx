"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import type { Locale } from "@/lib/i18n";
import { getDemoGlobalJobBrief, type GlobalJobBriefData } from "@/lib/job-brief-demo-data";

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
  defaultOpen = true,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface)]">
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">{eyebrow}</p>
            ) : null}
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
          </div>
          <span className="twin-muted text-xs group-open:rotate-180 transition-transform" aria-hidden>
            ▾
          </span>
        </div>
      </summary>
      <div className="border-t border-[var(--twin-border)] px-4 py-3">{children}</div>
    </details>
  );
}

function RatingPill({ label, value, suffix = "" }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-[var(--twin-accent)]/25 bg-[var(--twin-accent-muted)] px-3 py-2 text-center">
      <p className="text-lg font-bold text-[var(--twin-accent)]">
        {value}
        {suffix}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">{label}</p>
    </div>
  );
}

function BriefHeader({
  company,
  jobTitle,
  brief,
  t,
}: {
  company: string;
  jobTitle: string;
  brief: GlobalJobBriefData;
  t: (key: import("@/lib/i18n").TranslationKey) => string;
}) {
  return (
    <header className="space-y-4">
      <p
        className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100"
        role="note"
      >
        {t("jobBrief.demoBanner")}
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] text-lg font-bold text-[var(--twin-accent)]"
          aria-hidden
        >
          {company.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{company}</h2>
          <p className="twin-muted text-sm">{jobTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{brief.brandBlurb}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-56">
          <RatingPill label={t("jobBrief.ratingGlassdoor")} value={brief.ratings.glassdoor} />
          <RatingPill label={t("jobBrief.ratingCeo")} value={brief.ratings.ceo} suffix="%" />
          <RatingPill label={t("jobBrief.ratingRecommend")} value={brief.ratings.recommendPct} suffix="%" />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="twin-muted">{t("jobBrief.factIndustry")}</dt>
          <dd className="font-medium">{brief.facts.industry}</dd>
        </div>
        <div>
          <dt className="twin-muted">{t("jobBrief.factFounded")}</dt>
          <dd className="font-medium">{brief.facts.founded}</dd>
        </div>
        <div>
          <dt className="twin-muted">{t("jobBrief.factEmployees")}</dt>
          <dd className="font-medium">{brief.facts.employees}</dd>
        </div>
        <div>
          <dt className="twin-muted">{t("jobBrief.factHq")}</dt>
          <dd className="font-medium">{brief.facts.hq}</dd>
        </div>
      </dl>
    </header>
  );
}

function SimilarRolesCarousel({
  roles,
  t,
}: {
  roles: GlobalJobBriefData["similarRoles"];
  t: (key: import("@/lib/i18n").TranslationKey) => string;
}) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto pb-1">
      {roles.map((role) => (
        <article
          key={`${role.title}-${role.location}`}
          className="min-w-[12rem] shrink-0 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-3"
        >
          <p className="text-sm font-semibold">{role.title}</p>
          <p className="twin-muted mt-1 text-xs">
            {role.location} · {role.seniority}
          </p>
          <button type="button" className="twin-link mt-2 text-xs" disabled title={t("jobBrief.similarRolesDemoHint")}>
            {t("jobBrief.similarRolesCta")}
          </button>
        </article>
      ))}
    </div>
  );
}

export function GlobalJobBriefPanel({
  company,
  jobTitle,
  location,
}: {
  company: string;
  jobTitle: string;
  location?: string | null;
}) {
  const { t, locale } = useTranslation();
  const brief = useMemo(
    () => getDemoGlobalJobBrief({ company, title: jobTitle, location: location ?? null }, locale as Locale),
    [company, jobTitle, location, locale],
  );

  const chips = [
    { label: t("jobBrief.chipRoleFamily"), value: brief.chipValues.roleFamily },
    { label: t("jobBrief.chipSeniority"), value: brief.chipValues.seniority },
    { label: t("jobBrief.chipEmployment"), value: brief.chipValues.employment },
    { label: t("jobBrief.chipTeamSize"), value: brief.chipValues.teamSize },
    { label: t("jobBrief.chipReportsTo"), value: brief.chipValues.reportsTo },
    { label: t("jobBrief.chipComp"), value: brief.chipValues.compBand },
    { label: t("jobBrief.chipEquity"), value: brief.chipValues.equity },
    { label: t("jobBrief.chipWorkModel"), value: brief.chipValues.workModel },
    { label: t("jobBrief.chipVisa"), value: brief.chipValues.visa },
    { label: t("jobBrief.chipRelocation"), value: brief.chipValues.relocation },
    { label: t("jobBrief.chipTravel"), value: brief.chipValues.travel },
  ];

  return (
    <div className="space-y-4">
      <BriefHeader company={company} jobTitle={jobTitle} brief={brief} t={t} />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {chips.map((c) => (
          <MetaChip key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <Section eyebrow={t("jobBrief.sectionRoleEyebrow")} title={t("jobBrief.sectionRoleTitle")}>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">{t("jobBrief.responsibilities")}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--twin-muted-strong)]">
              {brief.responsibilities.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">{t("jobBrief.qualifications")}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--twin-muted-strong)]">
              {brief.qualifications.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">{t("jobBrief.niceToHave")}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--twin-muted-strong)]">
              {brief.niceToHave.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">{t("jobBrief.techStack")}</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)] px-2 py-0.5 text-xs font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow={t("jobBrief.sectionOfficesEyebrow")} title={t("jobBrief.sectionOfficesTitle")}>
        <ul className="space-y-2 text-sm">
          {brief.offices.map((o) => (
            <li
              key={`${o.city}-${o.country}`}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--twin-border)]/60 pb-2 last:border-0"
            >
              <span className="font-medium">
                {o.city}, {o.country}
              </span>
              <span className="twin-muted text-xs">
                {t("jobBrief.officeHeadcount")}: {o.headcount} · {o.timezone}
              </span>
            </li>
          ))}
        </ul>
        <p className="twin-muted mt-3 text-xs">
          {t("jobBrief.factRevenue")}: {brief.facts.revenue}
          {brief.facts.ticker ? ` · ${t("jobBrief.factTicker")}: ${brief.facts.ticker}` : ""}
        </p>
      </Section>

      <Section eyebrow={t("jobBrief.sectionCultureEyebrow")} title={t("jobBrief.sectionCultureTitle")}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
          {brief.cultureHighlights.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          <span className="font-semibold text-[var(--foreground)]">{t("jobBrief.dei")}: </span>
          {brief.deiNote}
        </p>
      </Section>

      <Section title={t("jobBrief.sectionBenefitsTitle")} defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
          {brief.benefits.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Section>

      <Section eyebrow={t("jobBrief.sectionProcessEyebrow")} title={t("jobBrief.sectionProcessTitle")}>
        <ol className="space-y-3">
          {brief.interviewSteps.map((step, i) => (
            <li key={step.stage} className="flex gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--twin-accent-muted)] text-xs font-bold text-[var(--twin-accent)]">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{step.stage}</p>
                <p className="twin-muted text-xs">
                  {step.duration} — {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow={t("jobBrief.sectionTimelineEyebrow")} title={t("jobBrief.sectionTimelineTitle")} defaultOpen={false}>
        <ol className="relative space-y-3 border-l-2 border-[var(--twin-accent)]/40 pl-4 text-sm">
          {brief.applicationTimeline.map((step) => (
            <li key={step.stage} className="relative">
              <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
              <p className="font-semibold">{step.stage}</p>
              <p className="twin-muted text-xs">
                {step.duration} — {step.detail}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t("jobBrief.sectionSimilarTitle")} defaultOpen={false}>
        <SimilarRolesCarousel roles={brief.similarRoles} t={t} />
      </Section>
    </div>
  );
}
