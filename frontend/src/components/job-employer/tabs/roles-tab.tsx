"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { buildEmployerContactDemo } from "@/lib/job-employer-demo";
import { getDemoGlobalJobBrief } from "@/lib/job-brief-demo-data";
import type { Locale } from "@/lib/i18n";

export function JobEmployerRolesTab({
  company,
  jobTitle,
  location,
}: {
  company: string;
  jobTitle: string;
  location?: string | null;
}) {
  const { t, locale } = useTranslation();
  const contact = useMemo(() => buildEmployerContactDemo(company, jobTitle), [company, jobTitle]);
  const brief = useMemo(
    () => getDemoGlobalJobBrief({ company, title: jobTitle, location: location ?? null }, locale as Locale),
    [company, jobTitle, location, locale],
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("jobEmployer.tabRoles")}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{t("jobBrief.sectionSimilarTitle")}</h3>
        <ul className="mt-4 space-y-3">
          {contact.openRoles.map((role) => (
            <li
              key={role.id}
              className={`rounded-xl border px-4 py-3 ${
                role.isCurrentJob
                  ? "border-[var(--twin-accent)]/50 bg-[var(--twin-accent-muted)]"
                  : "border-[var(--twin-border)] bg-[var(--twin-surface-raised)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{role.title}</p>
                  <p className="twin-muted text-sm">
                    {role.location} · {role.team}
                  </p>
                </div>
                {role.isCurrentJob ? (
                  <span className="rounded-full bg-[var(--twin-accent)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-accent)]">
                    {t("jobEmployer.contactRolesCurrent")}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("jobBrief.chipRoleFamily")}</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--twin-border)] p-3 text-sm">
            <p className="twin-muted text-xs">{t("jobBrief.chipSeniority")}</p>
            <p className="font-medium">{brief.chipValues.seniority}</p>
          </div>
          <div className="rounded-lg border border-[var(--twin-border)] p-3 text-sm">
            <p className="twin-muted text-xs">{t("jobBrief.chipComp")}</p>
            <p className="font-medium">{brief.chipValues.compBand}</p>
          </div>
          <div className="rounded-lg border border-[var(--twin-border)] p-3 text-sm">
            <p className="twin-muted text-xs">{t("jobBrief.chipVisa")}</p>
            <p className="font-medium">{brief.chipValues.visa}</p>
          </div>
          <div className="rounded-lg border border-[var(--twin-border)] p-3 text-sm">
            <p className="twin-muted text-xs">{t("jobBrief.chipRelocation")}</p>
            <p className="font-medium">{brief.chipValues.relocation}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("jobBrief.sectionProcessTitle")}</h3>
        <ol className="mt-3 space-y-2">
          {brief.interviewSteps.map((step, i) => (
            <li key={step.stage} className="flex gap-3 text-sm">
              <span className="font-bold text-[var(--twin-accent)]">{i + 1}.</span>
              <span>
                <span className="font-medium">{step.stage}</span>
                <span className="twin-muted"> — {step.duration}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
