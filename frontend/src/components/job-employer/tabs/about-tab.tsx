"use client";

import Link from "next/link";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { EmployerTabSection } from "@/components/job-employer/employer-tab-section";
import { Card } from "@/components/ui";
import {
  EMPLOYER_ABOUT_DEMO,
  EMPLOYER_ABOUT_MAP_PINS,
  type EmployerAboutPersonaId,
} from "@/lib/employer-about-demo";
import type { EMPLOYER_ABOUT_MESSAGES_EN } from "@/lib/employer-about-messages";
import type { TranslationKey } from "@/lib/i18n";
import { PERSONA_ROUTE } from "@/lib/marketing-persona";

type AboutKey = keyof typeof EMPLOYER_ABOUT_MESSAGES_EN;

const PERSONA_LABEL: Record<EmployerAboutPersonaId, AboutKey> = {
  candidate: "personaCandidate",
  recruiter: "personaRecruiter",
  company: "personaCompany",
  investor: "personaInvestor",
};

const MILESTONE_YEAR_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.milestones)[number], AboutKey> = {
  y2018: "aboutMilestoneY2018Year",
  y2020: "aboutMilestoneY2020Year",
  y2022: "aboutMilestoneY2022Year",
  y2024: "aboutMilestoneY2024Year",
  y2025: "aboutMilestoneY2025Year",
  y2026: "aboutMilestoneY2026Year",
};

const MILESTONE_TITLE_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.milestones)[number], AboutKey> = {
  y2018: "aboutMilestoneY2018Title",
  y2020: "aboutMilestoneY2020Title",
  y2022: "aboutMilestoneY2022Title",
  y2024: "aboutMilestoneY2024Title",
  y2025: "aboutMilestoneY2025Title",
  y2026: "aboutMilestoneY2026Title",
};

const MILESTONE_BODY_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.milestones)[number], AboutKey> = {
  y2018: "aboutMilestoneY2018Body",
  y2020: "aboutMilestoneY2020Body",
  y2022: "aboutMilestoneY2022Body",
  y2024: "aboutMilestoneY2024Body",
  y2025: "aboutMilestoneY2025Body",
  y2026: "aboutMilestoneY2026Body",
};

const VALUE_TITLE_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.values)[number], AboutKey> = {
  calendarFirst: "aboutValueCalendarFirstTitle",
  builtByPractitioners: "aboutValueBuiltByPractitionersTitle",
  signalNotNoise: "aboutValueSignalNotNoiseTitle",
  consentByDesign: "aboutValueConsentByDesignTitle",
  globalFromDayOne: "aboutValueGlobalFromDayOneTitle",
};

const VALUE_BODY_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.values)[number], AboutKey> = {
  calendarFirst: "aboutValueCalendarFirstBody",
  builtByPractitioners: "aboutValueBuiltByPractitionersBody",
  signalNotNoise: "aboutValueSignalNotNoiseBody",
  consentByDesign: "aboutValueConsentByDesignBody",
  globalFromDayOne: "aboutValueGlobalFromDayOneBody",
};

const STAT_VALUE_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.stats)[number], AboutKey> = {
  countries: "aboutStatCountriesValue",
  employees: "aboutStatEmployeesValue",
  acceptanceRate: "aboutStatAcceptanceRateValue",
  timeToFill: "aboutStatTimeToFillValue",
};

const STAT_LABEL_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.stats)[number], AboutKey> = {
  countries: "aboutStatCountriesLabel",
  employees: "aboutStatEmployeesLabel",
  acceptanceRate: "aboutStatAcceptanceRateLabel",
  timeToFill: "aboutStatTimeToFillLabel",
};

const LEADER_NAME_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.leaders)[number], AboutKey> = {
  ceo: "aboutLeaderCeoName",
  chro: "aboutLeaderChroName",
  cto: "aboutLeaderCtoName",
  vpProduct: "aboutLeaderVpProductName",
};

const LEADER_ROLE_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.leaders)[number], AboutKey> = {
  ceo: "aboutLeaderCeoRole",
  chro: "aboutLeaderChroRole",
  cto: "aboutLeaderCtoRole",
  vpProduct: "aboutLeaderVpProductRole",
};

const LEADER_BIO_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.leaders)[number], AboutKey> = {
  ceo: "aboutLeaderCeoBio",
  chro: "aboutLeaderChroBio",
  cto: "aboutLeaderCtoBio",
  vpProduct: "aboutLeaderVpProductBio",
};

const MAP_PIN_LABEL_KEY: Record<(typeof EMPLOYER_ABOUT_MAP_PINS)[number]["id"], AboutKey> = {
  warsaw: "aboutMapPinWarsaw",
  london: "aboutMapPinLondon",
  amsterdam: "aboutMapPinAmsterdam",
  nyc: "aboutMapPinNyc",
  austin: "aboutMapPinAustin",
  singapore: "aboutMapPinSingapore",
  tokyo: "aboutMapPinTokyo",
  sydney: "aboutMapPinSydney",
};

const ROLE_TITLE_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.relatedRoles)[number], AboutKey> = {
  r1: "aboutRoleR1Title",
  r2: "aboutRoleR2Title",
  r3: "aboutRoleR3Title",
  r4: "aboutRoleR4Title",
  r5: "aboutRoleR5Title",
  r6: "aboutRoleR6Title",
};

const ROLE_META_KEY: Record<(typeof EMPLOYER_ABOUT_DEMO.relatedRoles)[number], AboutKey> = {
  r1: "aboutRoleR1Meta",
  r2: "aboutRoleR2Meta",
  r3: "aboutRoleR3Meta",
  r4: "aboutRoleR4Meta",
  r5: "aboutRoleR5Meta",
  r6: "aboutRoleR6Meta",
};

const PERSONA_CTA_HREF: Record<EmployerAboutPersonaId, string> = {
  candidate: PERSONA_ROUTE.candidate,
  recruiter: PERSONA_ROUTE.recruiter,
  company: PERSONA_ROUTE.company,
  investor: PERSONA_ROUTE.investor,
};

function aboutKey(key: AboutKey): TranslationKey {
  return `employerAbout.${key}`;
}

function PersonaPanel({ persona }: { persona: EmployerAboutPersonaId }) {
  const { t } = useTranslation();
  const cap = persona.charAt(0).toUpperCase() + persona.slice(1);
  const pains = [1, 2, 3] as const;
  const outcomes = [1, 2, 3] as const;

  return (
    <Card className="!mb-0 p-5" variant="soft">
      <h3 className="text-base font-semibold text-[var(--foreground)]">
        {t(aboutKey(`persona${cap}Headline` as AboutKey))}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
        {t(aboutKey(`persona${cap}Intro` as AboutKey))}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("employerAbout.personaPainLabel")}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[var(--twin-muted-strong)]">
            {pains.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-[var(--twin-accent)]" aria-hidden>
                  ·
                </span>
                {t(aboutKey(`persona${cap}Pain${n}` as AboutKey))}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
            {t("employerAbout.personaOutcomeLabel")}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[var(--foreground)]">
            {outcomes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-[var(--twin-accent)]" aria-hidden>
                  ✓
                </span>
                {t(aboutKey(`persona${cap}Outcome${n}` as AboutKey))}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link href={PERSONA_CTA_HREF[persona]} className="twin-btn-solid twin-touch-target mt-5 inline-flex !w-auto px-4 text-sm">
        {t(aboutKey(`persona${cap}Cta` as AboutKey))}
      </Link>
    </Card>
  );
}

export function JobEmployerAboutTab({ company }: { company: string }) {
  const { t } = useTranslation();
  const [persona, setPersona] = useState<EmployerAboutPersonaId>("candidate");
  const heroLead = t("employerAbout.aboutHeroLead").replace("{company}", company);
  const rolesLead = t("employerAbout.aboutRolesLead");
  const rolesTitle = t("employerAbout.aboutRolesTitle").replace("{company}", company);

  return (
    <div className="space-y-10 pb-4">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("employerAbout.aboutHeroEyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {t("employerAbout.aboutHeroTitle")}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted)]">{heroLead}</p>
        <p className="text-xs italic text-[var(--twin-muted)]">{t("employerAbout.aboutDemoNote")}</p>
      </header>

      <EmployerTabSection
        title={t("employerAbout.aboutPersonaSectionTitle")}
        lead={t("employerAbout.aboutPersonaSectionLead")}
      >
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label={t("employerAbout.aboutPersonaSectionTitle")}
        >
          {EMPLOYER_ABOUT_DEMO.personas.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={persona === id}
              onClick={() => setPersona(id)}
              className={`twin-touch-target rounded-lg border px-3 py-2 text-xs font-semibold sm:text-sm ${
                persona === id
                  ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)] text-[var(--foreground)]"
                  : "border-[var(--twin-border)] text-[var(--twin-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t(aboutKey(PERSONA_LABEL[id]))}
            </button>
          ))}
        </div>
        <div className="mt-4" role="tabpanel">
          <PersonaPanel persona={persona} />
        </div>
      </EmployerTabSection>

      <EmployerTabSection title={t("employerAbout.aboutMissionTitle")}>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("employerAbout.aboutMissionBody")}
        </p>
      </EmployerTabSection>

      <EmployerTabSection title={t("employerAbout.aboutValuesTitle")}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EMPLOYER_ABOUT_DEMO.values.map((id) => (
            <li key={id}>
              <Card className="!mb-0 h-full p-4" variant="soft">
                <p className="text-sm font-semibold text-[var(--foreground)]">{t(aboutKey(VALUE_TITLE_KEY[id]))}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t(aboutKey(VALUE_BODY_KEY[id]))}</p>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <Card className="!mb-0 border-[var(--twin-accent)]/25 p-5" variant="accent">
        <EmployerTabSection title={t("employerAbout.aboutFounderTitle")}>
          <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("employerAbout.aboutFounderBody")}</p>
          <blockquote className="mt-4 border-l-2 border-[var(--twin-accent)] pl-4 text-sm italic text-[var(--foreground)]">
            {t("employerAbout.aboutFounderQuote")}
          </blockquote>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("employerAbout.aboutFounderAttribution")}</p>
        </EmployerTabSection>
      </Card>

      <EmployerTabSection title={t("employerAbout.aboutLeadershipTitle")} lead={t("employerAbout.aboutLeadershipLead")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EMPLOYER_ABOUT_DEMO.leaders.map((id) => (
            <li key={id}>
              <Card className="!mb-0 p-4">
                <p className="font-semibold text-[var(--foreground)]">{t(aboutKey(LEADER_NAME_KEY[id]))}</p>
                <p className="text-xs font-medium text-[var(--twin-accent)]">{t(aboutKey(LEADER_ROLE_KEY[id]))}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted)]">{t(aboutKey(LEADER_BIO_KEY[id]))}</p>
              </Card>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("employerAbout.aboutMilestonesTitle")}>
        <ol className="relative space-y-4 border-l border-[var(--twin-border)] pl-6">
          {EMPLOYER_ABOUT_DEMO.milestones.map((id) => (
            <li key={id} className="relative">
              <span
                className="absolute -left-[1.6rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--twin-accent-muted)] text-[9px] font-bold text-[var(--twin-accent)]"
                aria-hidden
              >
                ·
              </span>
              <p className="text-xs font-bold tabular-nums text-[var(--twin-accent)]">{t(aboutKey(MILESTONE_YEAR_KEY[id]))}</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{t(aboutKey(MILESTONE_TITLE_KEY[id]))}</p>
              <p className="mt-0.5 text-xs text-[var(--twin-muted)]">{t(aboutKey(MILESTONE_BODY_KEY[id]))}</p>
            </li>
          ))}
        </ol>
      </EmployerTabSection>

      <EmployerTabSection title={t("employerAbout.aboutMapTitle")} lead={t("employerAbout.aboutMapLead")}>
        <div className="grid grid-cols-5 grid-rows-5 gap-2 rounded-xl border border-[var(--twin-border)] bg-gradient-to-br from-slate-900/80 to-[var(--twin-surface-raised)] p-4 min-h-[12rem]">
          {EMPLOYER_ABOUT_MAP_PINS.map((pin) => (
            <div
              key={pin.id}
              className={`${pin.gridClass} flex items-center justify-center`}
            >
              <span className="rounded-md border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground)] shadow-sm">
                {t(aboutKey(MAP_PIN_LABEL_KEY[pin.id]))}
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          <li>{t("employerAbout.aboutMapRegionEmea")}</li>
          <li>{t("employerAbout.aboutMapRegionAmericas")}</li>
          <li>{t("employerAbout.aboutMapRegionApac")}</li>
        </ul>
      </EmployerTabSection>

      <EmployerTabSection title={t("employerAbout.aboutStatsTitle")}>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {EMPLOYER_ABOUT_DEMO.stats.map((id) => (
            <div
              key={id}
              className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-4 py-3 text-center"
            >
              <dt className="text-xs text-[var(--twin-muted)]">{t(aboutKey(STAT_LABEL_KEY[id]))}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-[var(--twin-accent)]">
                {t(aboutKey(STAT_VALUE_KEY[id]))}
              </dd>
            </div>
          ))}
        </dl>
      </EmployerTabSection>

      <EmployerTabSection title={rolesTitle} lead={rolesLead}>
        <ul className="divide-y divide-[var(--twin-border)] rounded-lg border border-[var(--twin-border)] bg-[var(--twin-card)]">
          {EMPLOYER_ABOUT_DEMO.relatedRoles.map((roleId) => (
            <li key={roleId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{t(aboutKey(ROLE_TITLE_KEY[roleId]))}</p>
                <p className="text-xs text-[var(--twin-muted)]">{t(aboutKey(ROLE_META_KEY[roleId]))}</p>
              </div>
              <span className="text-xs font-medium text-[var(--twin-accent)]">{t("employerAbout.aboutRoleViewLabel")}</span>
            </li>
          ))}
        </ul>
      </EmployerTabSection>

      <Card className="!mb-0 p-5" variant="accent">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{t("employerAbout.aboutNorthStarTitle")}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("employerAbout.aboutNorthStarBody")}
        </p>
      </Card>
    </div>
  );
}
