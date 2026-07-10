"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  FOUNDER_UPDATES,
  MILESTONE_ITEMS,
  RISK_ITEMS,
  ROADMAP_PHASES,
  SHIPPED_ITEMS,
  type RoadmapPhase,
} from "@/lib/investor-founder-roadmap";
import {
  COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF,
  TRUST_CENTER_ROADMAP_OUTSIDE_HREF,
} from "@/lib/all-workspace-green-gate";
import { TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE } from "@/lib/seven-day-d2-candidate";
import {
  COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "@/lib/seven-day-d4-company";
import {
  RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
} from "@/lib/seven-day-d3-recruiter";
import type { TranslationKey } from "@/lib/i18n";

function phaseTitleKey(phase: RoadmapPhase): TranslationKey {
  if (phase === "now") return "investorRoadmap.nowTitle";
  if (phase === "next") return "investorRoadmap.nextTitle";
  return "investorRoadmap.laterTitle";
}

function phaseAccent(phase: RoadmapPhase): string {
  if (phase === "now") return "border-[var(--twin-accent)]/40 bg-[var(--twin-accent)]/5";
  if (phase === "next") return "border-sky-500/30 bg-sky-500/5";
  return "border-[var(--twin-border)] bg-[var(--twin-surface-raised)]";
}

function BulletList({ itemKeys }: { itemKeys: readonly TranslationKey[] }) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
      {itemKeys.map((key) => (
        <li key={key} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--twin-accent)]/70" aria-hidden />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

export function InvestorRoadmapFounderUpdatesPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8" data-testid="investor-roadmap-founder-updates">
      <Card className="border border-amber-500/25 bg-amber-500/5 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">
          {t("investorRoadmap.launchStanceLabel")}
        </p>
        <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{t("investorRoadmap.launchStanceHeadline")}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("investorRoadmap.launchStanceBody")}</p>
      </Card>

      <section aria-labelledby="roadmap-phases-heading">
        <h2 id="roadmap-phases-heading" className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
          {t("investorRoadmap.roadmapSectionTitle")}
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {ROADMAP_PHASES.map(({ phase, items }) => (
            <Card key={phase} className={`border p-5 ${phaseAccent(phase)}`} data-phase={phase}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--twin-accent)]">
                {t(phaseTitleKey(phase))}
              </p>
              <BulletList itemKeys={items.map((id) => `investorRoadmap.${id}` as TranslationKey)} />
            </Card>
          ))}
        </div>
      </section>

      {TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <section
          id="candidate-trust-center"
          aria-labelledby="candidate-trust-center-heading"
          data-wave3-trust-center-roadmap
        >
          <h2
            id="candidate-trust-center-heading"
            className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]"
          >
            {t("investorRoadmap.candidateTrustCenterRoadmapTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {t("investorRoadmap.candidateTrustCenterRoadmapLead")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("investorRoadmap.candidateTrustCenterRoadmapBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="twin-link font-medium">
                {t("investorRoadmap.candidateTrustCenterRoadmapPrivacyLink")}
              </Link>
              <Link href="/terms" className="twin-link font-medium">
                {t("investorRoadmap.candidateTrustCenterRoadmapTermsLink")}
              </Link>
              <Link href={TRUST_CENTER_ROADMAP_OUTSIDE_HREF} className="twin-link font-medium">
                {t("profile.trustRoadmapLink")}
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      {RECRUITER_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <section
          id="recruiter-integrations"
          aria-labelledby="recruiter-integrations-heading"
          data-wave3-recruiter-integrations-roadmap
        >
          <h2
            id="recruiter-integrations-heading"
            className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]"
          >
            {t("investorRoadmap.recruiterIntegrationsRoadmapTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {t("investorRoadmap.recruiterIntegrationsRoadmapLead")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("investorRoadmap.recruiterIntegrationsRoadmapBody")}
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              <li>{t("investorRoadmap.recruiterIntegrationsRoadmapAts")}</li>
              <li>{t("investorRoadmap.recruiterIntegrationsRoadmapCalendar")}</li>
              <li>{t("investorRoadmap.recruiterIntegrationsRoadmapCsv")}</li>
              <li>{t("investorRoadmap.recruiterIntegrationsRoadmapWebhooks")}</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/recruiter/integrations" className="twin-link font-medium">
                {t("investorRoadmap.recruiterIntegrationsReadinessLink")}
              </Link>
              <Link href={RECRUITER_INTEGRATIONS_ROADMAP_OUTSIDE_HREF} className="twin-link font-medium">
                {t("recruiterIntegrations.roadmapLink")}
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      {COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <section
          id="company-integrations"
          aria-labelledby="company-integrations-heading"
          data-wave3-company-integrations-roadmap
        >
          <h2
            id="company-integrations-heading"
            className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]"
          >
            {t("investorRoadmap.companyIntegrationsRoadmapTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {t("investorRoadmap.companyIntegrationsRoadmapLead")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("investorRoadmap.companyIntegrationsRoadmapBody")}
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              <li>{t("investorRoadmap.companyIntegrationsRoadmapAts")}</li>
              <li>{t("investorRoadmap.companyIntegrationsRoadmapCalendar")}</li>
              <li>{t("investorRoadmap.companyIntegrationsRoadmapCsv")}</li>
              <li>{t("investorRoadmap.companyIntegrationsRoadmapWebhooks")}</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/company/integrations" className="twin-link font-medium">
                {t("investorRoadmap.companyIntegrationsReadinessLink")}
              </Link>
              <Link href={COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF} className="twin-link font-medium">
                {t("companyIntegrations.roadmapLink")}
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recently-shipped-heading">
          <h2 id="recently-shipped-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
            {t("investorRoadmap.shippedTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-5">
            <BulletList itemKeys={SHIPPED_ITEMS.map((id) => `investorRoadmap.${id}` as TranslationKey)} />
          </Card>
        </section>

        <section aria-labelledby="h5c-review-heading">
          <h2 id="h5c-review-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
            {t("investorRoadmap.h5cTitle")}
          </h2>
          <Card className="border border-rose-500/25 bg-rose-500/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {t("investorRoadmap.h5cStatus")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("investorRoadmap.h5cBody")}</p>
          </Card>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="risks-heading">
          <h2 id="risks-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
            {t("investorRoadmap.risksTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] p-5">
            <BulletList itemKeys={RISK_ITEMS.map((id) => `investorRoadmap.${id}` as TranslationKey)} />
          </Card>
        </section>

        <section aria-labelledby="milestones-heading">
          <h2 id="milestones-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
            {t("investorRoadmap.milestonesTitle")}
          </h2>
          <Card className="border border-[var(--twin-border)] p-5">
            <BulletList itemKeys={MILESTONE_ITEMS.map((id) => `investorRoadmap.${id}` as TranslationKey)} />
          </Card>
        </section>
      </div>

      <section aria-labelledby="founder-updates-heading">
        <h2 id="founder-updates-heading" className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
          {t("investorRoadmap.founderUpdatesTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FOUNDER_UPDATES.map((id) => (
            <Card key={id} className="border border-[var(--twin-border)] bg-[var(--twin-card)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {t(`investorRoadmap.${id}Date` as TranslationKey)}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {t(`investorRoadmap.${id}Title` as TranslationKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {t(`investorRoadmap.${id}Body` as TranslationKey)}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="space-y-2 border-t border-[var(--twin-border)] pt-6 text-xs leading-relaxed text-[var(--twin-muted)]">
        <p>{t("investorRoadmap.honestyNote")}</p>
        <p>{t("investorRoadmap.sourceNote")}</p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link href="/investor/metrics" className="twin-link font-medium">
            {t("investorRoadmap.metricsLink")}
          </Link>
          <Link href="/status" className="twin-link font-medium">
            {t("investorRoadmap.statusLink")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
