"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { buildEmployerContactDemo, type EmployerDepartment } from "@/lib/job-employer-demo";
import type { JOB_EMPLOYER_MESSAGES_EN } from "@/lib/job-employer-messages";
import type { TranslationKey } from "@/lib/i18n";

type DeptLabelKey = EmployerDepartment["labelKey"];

function deptLabel(t: (k: TranslationKey) => string, key: DeptLabelKey): string {
  return t(`jobEmployer.${key}`);
}

type ContactTabProps = {
  company: string;
  jobId: number;
  jobTitle: string;
  jobUrl?: string;
};

export function JobEmployerContactTab({ company, jobId, jobTitle, jobUrl }: ContactTabProps) {
  const { t } = useTranslation();
  const demo = useMemo(() => buildEmployerContactDemo(company, jobTitle), [company, jobTitle]);

  const mailto = (subject: string, body?: string) => {
    const recruiting = demo.departments.find((d) => d.id === "rec")?.email ?? `talent@demo.invalid`;
    const params = new URLSearchParams({ subject });
    if (body) params.set("body", body);
    return `mailto:${recruiting}?${params.toString()}`;
  };

  const ctas: { labelKey: keyof typeof JOB_EMPLOYER_MESSAGES_EN; href: string }[] = [
    {
      labelKey: "contactCtaApply",
      href: jobUrl ?? mailto(`Application — ${jobTitle}`, `Job ID: ${jobId}\nRole: ${jobTitle}`),
    },
    {
      labelKey: "contactCtaRecruiter",
      href: mailto(`Recruiter inquiry — ${company}`),
    },
    {
      labelKey: "contactCtaPress",
      href: `mailto:${demo.departments.find((d) => d.id === "press")?.email ?? "press@demo.invalid"}?subject=Press%20inquiry`,
    },
    {
      labelKey: "contactCtaPartnerships",
      href: `mailto:${demo.departments.find((d) => d.id === "partners")?.email ?? "alliances@demo.invalid"}?subject=Partnership`,
    },
  ];

  const regions: Array<"EMEA" | "Americas" | "APAC"> = ["EMEA", "Americas", "APAC"];

  return (
    <div className="space-y-8 pb-2">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("jobEmployer.contactEyebrow")}
        </p>
        <h3 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">{t("jobEmployer.contactTitle")}</h3>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("jobEmployer.contactLead")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("jobEmployer.contactStatsCountries"), value: String(demo.globalStats.countries) },
          { label: t("jobEmployer.contactStatsOffices"), value: String(demo.globalStats.offices) },
          { label: t("jobEmployer.contactStatsEmployees"), value: demo.globalStats.employeesLabel },
        ].map((stat) => (
          <Card key={stat.label} variant="soft" className="!p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[var(--twin-muted)]">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div
        className="flex min-h-[7rem] items-center justify-center rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 px-4 text-center text-sm text-[var(--twin-muted-strong)]"
        role="img"
        aria-label={t("jobEmployer.contactMapPlaceholder")}
      >
        {t("jobEmployer.contactMapPlaceholder")}
      </div>

      <section>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("jobEmployer.contactOfficesTitle")}</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {regions.map((region) => (
            <div key={region} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-accent)]">{region}</p>
              <ul className="space-y-2">
                {demo.offices
                  .filter((o) => o.region === region)
                  .map((office) => (
                    <li
                      key={office.id}
                      className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[var(--foreground)]">{office.city}</span>
                        {office.isHq ? (
                          <span className="rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-accent)]">
                            {t("jobEmployer.contactOfficesHq")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{office.address}</p>
                      <p className="mt-2 text-xs text-[var(--twin-muted)]">
                        {office.timezone} · {office.phone}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactDepartmentsTitle")}</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {demo.departments.map((dept) => (
            <li
              key={dept.id}
              className="flex flex-col gap-1 rounded-lg border border-[var(--twin-border)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--foreground)]">{deptLabel(t, dept.labelKey)}</p>
                <a href={`mailto:${dept.email}`} className="twin-link text-xs">
                  {dept.email}
                </a>
              </div>
              <span className="shrink-0 text-xs text-[var(--twin-muted)]">
                {t("jobEmployer.contactDeptSla")}: {dept.responseSla}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactPeopleTitle")}</h3>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {demo.namedContacts.map((person) => (
            <li key={person.id} className="rounded-lg border border-[var(--twin-border)] p-4 text-sm">
              <p className="font-semibold text-[var(--foreground)]">{person.name}</p>
              <p className="text-[var(--twin-muted-strong)]">{person.role}</p>
              <p className="mt-2 text-xs text-[var(--twin-muted)]">
                {person.region} · {t("jobEmployer.contactPeopleLanguages")}: {person.languages}
              </p>
              <a href={`mailto:${person.email}`} className="twin-link mt-2 inline-block text-xs font-medium">
                {person.email}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Card variant="soft" className="!p-4">
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactSlaTitle")}</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">
              {t("jobEmployer.contactSlaCandidate")}
            </dt>
            <dd className="mt-1 text-[var(--twin-muted-strong)]">{demo.candidateSla}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--twin-muted)]">
              {t("jobEmployer.contactSlaHours")}
            </dt>
            <dd className="mt-1 text-[var(--twin-muted-strong)]">{demo.businessHours}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactCtaTitle")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ctas.map((cta) => (
            <a
              key={cta.labelKey}
              href={cta.href}
              className="twin-btn-secondary twin-touch-target inline-flex !w-auto items-center px-4 py-2 text-xs font-semibold"
            >
              {t(`jobEmployer.${cta.labelKey}`)}
            </a>
          ))}
        </div>
      </section>

      <Card variant="soft" className="!p-4">
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactA11yTitle")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("jobEmployer.contactA11yBody")}</p>
        <a
          href={`mailto:${demo.departments.find((d) => d.id === "a11y")?.email ?? "accessibility@demo.invalid"}`}
          className="twin-link mt-3 inline-block text-sm font-medium"
        >
          {demo.departments.find((d) => d.id === "a11y")?.email}
        </a>
      </Card>

      <Card className="!border-amber-500/30 !bg-amber-500/5 !p-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("jobEmployer.contactWhistleTitle")}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("jobEmployer.contactWhistleBody")}</p>
        <p className="mt-3 text-sm font-medium text-[var(--foreground)]">{demo.whistleblowerPhone}</p>
        <a href={`mailto:${demo.whistleblowerEmail}`} className="twin-link text-sm">
          {demo.whistleblowerEmail}
        </a>
      </Card>

      <section>
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactRolesTitle")}</h3>
        <ul className="mt-3 space-y-2">
          {demo.openRoles.map((role) => (
            <li
              key={role.id}
              className="flex flex-col gap-2 rounded-lg border border-[var(--twin-border)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  {role.title}
                  {role.isCurrentJob ? (
                    <span className="ml-2 text-xs font-normal text-[var(--twin-accent)]">
                      · {t("jobEmployer.contactRolesCurrent")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--twin-muted)]">
                  {role.team} · {role.location}
                </p>
              </div>
              <a
                href={mailto(`Role conversation — ${role.title}`, `Interested in: ${role.title} at ${company}`)}
                className="twin-btn-solid twin-touch-target shrink-0 !w-auto px-3 py-1.5 text-xs"
              >
                {t("jobEmployer.contactRoleTalk")}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold">{t("jobEmployer.contactSocialTitle")}</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href={demo.social.linkedIn} target="_blank" rel="noopener noreferrer" className="twin-link font-medium">
            {t("jobEmployer.contactSocialLinkedIn")}
          </a>
          <a href={demo.social.careers} target="_blank" rel="noopener noreferrer" className="twin-link font-medium">
            {t("jobEmployer.contactSocialCareers")}
          </a>
          <a href={demo.social.glassdoor} target="_blank" rel="noopener noreferrer" className="twin-link font-medium">
            {t("jobEmployer.contactSocialGlassdoor")}
          </a>
        </div>
      </section>
    </div>
  );
}
