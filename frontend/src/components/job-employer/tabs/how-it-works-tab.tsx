"use client";

import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import {
  AFTER_APPLY_STEP_IDS,
  A11Y_ACCOMMODATION_IDS,
  DAY_IN_LIFE_VIDEO_IDS,
  GLOBAL_REGION_IDS,
  HIRING_JOURNEY_STEP_IDS,
  HIRING_TOOL_IDS,
  HOW_IT_WORKS_HERO_STATS,
  PREP_ITEM_IDS,
  RESPONSE_SLA_IDS,
  ROLE_FAMILY_IDS,
  ROLE_FAMILY_STAGE_IDS,
  type HiringJourneyStepId,
  type RoleFamilyId,
} from "@/lib/job-employer-how-it-works-demo";
import { buildEmployerContactDemo } from "@/lib/job-employer-demo";
import type { JOB_EMPLOYER_MESSAGES_EN } from "@/lib/job-employer-messages";
import type { TranslationKey } from "@/lib/i18n";

function cap(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function journeyKey(step: HiringJourneyStepId, field: "Title" | "Duration" | "Detail"): TranslationKey {
  return `jobEmployer.journey${cap(step)}${field}` as TranslationKey;
}

function afterApplyKey(step: (typeof AFTER_APPLY_STEP_IDS)[number], field: "Title" | "Detail"): TranslationKey {
  return `jobEmployer.afterApply${cap(step)}${field}` as TranslationKey;
}

function stageKey(stageId: string): TranslationKey {
  return `jobEmployer.stage${cap(stageId)}` as TranslationKey;
}

function toolKey(toolId: (typeof HIRING_TOOL_IDS)[number], field: "" | "Desc"): TranslationKey {
  const base = `tool${cap(toolId)}${field}`;
  return `jobEmployer.${base}` as TranslationKey;
}

function regionKey(region: (typeof GLOBAL_REGION_IDS)[number], field: "Title" | "Note"): TranslationKey {
  return `jobEmployer.region${cap(region)}${field}` as TranslationKey;
}

function slaKey(slaId: (typeof RESPONSE_SLA_IDS)[number], field: "" | "Value"): TranslationKey {
  return `jobEmployer.sla${cap(slaId)}${field}` as TranslationKey;
}

function prepKey(prepId: (typeof PREP_ITEM_IDS)[number], field: "Title" | "Detail"): TranslationKey {
  return `jobEmployer.prep${cap(prepId)}${field}` as TranslationKey;
}

function a11yKey(id: (typeof A11Y_ACCOMMODATION_IDS)[number]): TranslationKey {
  return `jobEmployer.a11y${cap(id)}` as TranslationKey;
}

function videoKey(videoId: (typeof DAY_IN_LIFE_VIDEO_IDS)[number], field: "Title" | "Duration"): TranslationKey {
  return `jobEmployer.video${cap(videoId)}${field}` as TranslationKey;
}

function roleFamilyKey(family: RoleFamilyId): TranslationKey {
  return `jobEmployer.roleFamily${cap(family)}` as TranslationKey;
}

const DEI_BULLETS = ["howDeiBullet1", "howDeiBullet2", "howDeiBullet3"] as const satisfies readonly (keyof typeof JOB_EMPLOYER_MESSAGES_EN)[];

const VIDEO_THUMB: Record<(typeof DAY_IN_LIFE_VIDEO_IDS)[number], string> = {
  productEngineer: "from-cyan-950 via-blue-900 to-slate-950",
  talentPartner: "from-violet-950 via-indigo-900 to-slate-950",
  campusGrad: "from-emerald-950 via-teal-900 to-slate-950",
};

type HowItWorksTabProps = {
  company: string;
  jobTitle: string;
  jobUrl?: string;
};

export function JobEmployerHowItWorksTab({ company, jobTitle, jobUrl }: HowItWorksTabProps) {
  const { t } = useTranslation();
  const lead = t("jobEmployer.howLead").replace("{company}", company);
  const rolesLead = t("jobEmployer.howRolesLead").replace("{company}", company);
  const demo = useMemo(() => buildEmployerContactDemo(company, jobTitle), [company, jobTitle]);

  const applyHref =
    jobUrl ??
    `mailto:${demo.departments.find((d) => d.id === "rec")?.email ?? "talent@demo.invalid"}?subject=${encodeURIComponent(`Application — ${jobTitle}`)}`;

  return (
    <div className="space-y-10 pb-2">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("jobEmployer.howEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {t("jobEmployer.howTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{lead}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {HOW_IT_WORKS_HERO_STATS.map((stat) => (
          <li key={stat.id}>
            <Card className="!mb-0 p-4 text-center" variant="soft">
              <p className="text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">{stat.value}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted)]">
                {t(`jobEmployer.${stat.labelKey}` as TranslationKey)}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <EmployerTabSection title={t("jobEmployer.howJourneyTitle")} lead={t("jobEmployer.howJourneyLead")}>
        <ol className="relative space-y-0 border-l-2 border-[var(--twin-accent)]/40 pl-6">
          {HIRING_JOURNEY_STEP_IDS.map((step, index) => (
            <li key={step} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[1.6rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--twin-accent-muted)] text-[10px] font-bold text-[var(--twin-accent)]">
                {index + 1}
              </span>
              <p className="text-sm font-semibold text-[var(--foreground)]">{t(journeyKey(step, "Title"))}</p>
              <p className="mt-0.5 text-xs font-medium text-[var(--twin-accent)]">{t(journeyKey(step, "Duration"))}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted)]">{t(journeyKey(step, "Detail"))}</p>
            </li>
          ))}
        </ol>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howAfterApplyTitle")} lead={t("jobEmployer.howAfterApplyLead")}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {AFTER_APPLY_STEP_IDS.map((step) => (
            <li key={step}>
              <Card className="!mb-0 h-full p-4" variant="soft">
                <p className="text-sm font-semibold">{t(afterApplyKey(step, "Title"))}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t(afterApplyKey(step, "Detail"))}</p>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howRoleTracksTitle")} lead={t("jobEmployer.howRoleTracksLead")}>
        <div className="grid gap-4 lg:grid-cols-3">
          {ROLE_FAMILY_IDS.map((family) => (
            <Card key={family} className="!mb-0 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {t(roleFamilyKey(family))}
              </p>
              <ol className="mt-3 space-y-2">
                {ROLE_FAMILY_STAGE_IDS[family].map((stageId, i) => (
                  <li key={stageId} className="flex gap-2 text-xs text-[var(--twin-muted-strong)]">
                    <span className="font-semibold text-[var(--twin-muted)]">{i + 1}.</span>
                    {t(stageKey(stageId))}
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howToolsTitle")} lead={t("jobEmployer.howToolsLead")}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HIRING_TOOL_IDS.map((toolId) => (
            <li
              key={toolId}
              className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)] px-3 py-3"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">{t(toolKey(toolId, ""))}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted)]">{t(toolKey(toolId, "Desc"))}</p>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howGlobalMapTitle")} lead={t("jobEmployer.howGlobalMapLead")}>
        <div className="grid gap-4 md:grid-cols-3">
          {GLOBAL_REGION_IDS.map((region) => (
            <Card key={region} className="!mb-0 p-4" variant="soft">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {t(regionKey(region, "Title"))}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                {t(regionKey(region, "Note"))}
              </p>
            </Card>
          ))}
        </div>
      </EmployerTabSection>

      <Card className="!mb-0 border-[var(--twin-accent)]/25 p-5" variant="soft">
        <EmployerTabSection title={t("jobEmployer.howDeiTitle")}>
          <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("jobEmployer.howDeiBody")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
            {DEI_BULLETS.map((key) => (
              <li key={key}>{t(`jobEmployer.${key}`)}</li>
            ))}
          </ul>
        </EmployerTabSection>
      </Card>

      <EmployerTabSection title={t("jobEmployer.howSlaTitle")} lead={t("jobEmployer.howSlaLead")}>
        <dl className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {RESPONSE_SLA_IDS.map((slaId) => (
            <div key={slaId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <dt className="text-sm text-[var(--twin-muted-strong)]">{t(slaKey(slaId, ""))}</dt>
              <dd className="text-sm font-semibold tabular-nums text-[var(--twin-accent)]">
                {t(slaKey(slaId, "Value"))}
              </dd>
            </div>
          ))}
        </dl>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howPrepTitle")} lead={t("jobEmployer.howPrepLead")}>
        <ul className="grid gap-3 md:grid-cols-3">
          {PREP_ITEM_IDS.map((prepId) => (
            <li key={prepId}>
              <Card className="!mb-0 h-full p-4" variant="soft">
                <p className="text-sm font-semibold">{t(prepKey(prepId, "Title"))}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t(prepKey(prepId, "Detail"))}</p>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howA11yTitle")} lead={t("jobEmployer.howA11yLead")}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted-strong)]">
          {A11Y_ACCOMMODATION_IDS.map((id) => (
            <li key={id}>{t(a11yKey(id))}</li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howVideosTitle")} lead={t("jobEmployer.howVideosLead")}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {DAY_IN_LIFE_VIDEO_IDS.map((videoId) => (
            <li key={videoId}>
              <div
                className={`flex aspect-video flex-col justify-end rounded-xl bg-gradient-to-br p-4 ${VIDEO_THUMB[videoId]}`}
              >
                <button
                  type="button"
                  className="mb-auto w-fit rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                  disabled
                >
                  ▶ {t("jobEmployer.videoPlay")}
                </button>
                <p className="text-sm font-semibold text-white">{t(videoKey(videoId, "Title"))}</p>
                <p className="text-xs text-white/80">{t(videoKey(videoId, "Duration"))}</p>
              </div>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("jobEmployer.howRolesTitle")} lead={rolesLead}>
        <ul className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {demo.openRoles.map((role) => (
            <li key={role.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {role.title}
                  {role.isCurrentJob ? (
                    <span className="ml-2 rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-accent)]">
                      {t("jobEmployer.howRolesCurrent")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--twin-muted)]">
                  {role.location} · {role.team}
                </p>
              </div>
              {role.isCurrentJob ? (
                <a href={applyHref} className="twin-btn-solid twin-touch-target !w-auto px-4 text-xs">
                  {t("jobEmployer.howRolesApplyCta")}
                </a>
              ) : (
                <button type="button" className="twin-link text-xs font-medium" disabled>
                  {t("jobEmployer.howRolesBrowseCta")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </EmployerTabSection>
    </div>
  );
}
