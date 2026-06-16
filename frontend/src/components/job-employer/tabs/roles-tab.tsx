"use client";

import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { capDemoArray, loadJobBriefDemoModule, loadJobEmployerDemoModule } from "@/lib/lazy-demo-data";
import type { GlobalJobBriefData } from "@/lib/job-brief-demo-data";
import type { Locale } from "@/lib/i18n";
import type { EmployerContactDemo } from "@/lib/job-employer-demo";

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
  const [contact, setContact] = useState<EmployerContactDemo | null>(null);
  const [brief, setBrief] = useState<GlobalJobBriefData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadJobEmployerDemoModule(), loadJobBriefDemoModule()]).then(([employerMod, briefMod]) => {
      if (cancelled) return;
      setContact(employerMod.buildEmployerContactDemo(company, jobTitle));
      const raw = briefMod.getDemoGlobalJobBrief(
        { company, title: jobTitle, location: location ?? null },
        locale as Locale,
      );
      setBrief({
        ...raw,
        similarRoles: capDemoArray(raw.similarRoles, 8),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [company, jobTitle, location, locale]);

  const openRoles = useMemo(() => contact?.openRoles ?? [], [contact]);

  if (!contact || !brief) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-[var(--twin-surface-soft)]" />
        <div className="h-32 rounded-xl bg-[var(--twin-surface-soft)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("jobEmployer.tabRoles")}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{t("jobBrief.sectionSimilarTitle")}</h3>
        <ul className="mt-4 space-y-3">
          {openRoles.map((role) => (
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
