"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  HIRING_JOURNEY_DEMO_CANDIDATE_ID,
  HIRING_JOURNEY_DEMO_ROLE_ID,
  type HiringJourneyPersona,
} from "@/lib/hiring-journey-demo-data";
import {
  HIRING_JOURNEY_MARKERS,
  HIRING_JOURNEY_PAGE_MARKER,
  hiringJourneyCrossLinks,
  hiringJourneyOverallStatusKey,
  hiringJourneyOwnerKey,
  hiringJourneySourceKey,
  hiringJourneyStepStatusKey,
  resolveHiringJourney,
} from "@/lib/hiring-journey";
import type { TranslationKey } from "@/lib/i18n";

const PERSONA_SUBTITLE_KEYS: Record<HiringJourneyPersona, TranslationKey> = {
  candidate: "hiringJourney.subtitleCandidate",
  recruiter: "hiringJourney.subtitleRecruiter",
  company: "hiringJourney.subtitleCompany",
  board: "hiringJourney.subtitleBoard",
};

type Props = {
  persona: HiringJourneyPersona;
};

export function HiringJourneyTimeline({ persona }: Props): ReactNode {
  const { t } = useTranslation();
  const journey = useMemo(() => resolveHiringJourney(persona), [persona]);
  const crossLinks = useMemo(() => hiringJourneyCrossLinks(persona), [persona]);

  return (
    <Shell wide rail={persona === "candidate"}>
      <div
        data-hiring-journey-page={HIRING_JOURNEY_PAGE_MARKER}
        data-testid={HIRING_JOURNEY_MARKERS.page}
        className="space-y-6"
      >
        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={HIRING_JOURNEY_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("hiringJourney.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("hiringJourney.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{t(PERSONA_SUBTITLE_KEYS[persona])}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-block rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-semibold uppercase"
                data-testid={HIRING_JOURNEY_MARKERS.readOnlyBadge}
              >
                {t("hiringJourney.readOnlyBadge")}
              </span>
              <span className="inline-block rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-semibold uppercase">
                {t("hiringJourney.pilotBadge")}
              </span>
            </div>
          </div>
          <p className="font-mono text-xs text-[var(--twin-muted)]">
            {journey.journeyId} · {HIRING_JOURNEY_DEMO_CANDIDATE_ID} · {HIRING_JOURNEY_DEMO_ROLE_ID}
          </p>
          <span
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-testid={HIRING_JOURNEY_MARKERS.sourceBadge}
          >
            {t(hiringJourneySourceKey(journey.source))}
          </span>
        </header>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-4 sm:p-5"
          data-testid={HIRING_JOURNEY_MARKERS.readOnlyNote}
        >
          <p className="text-xs text-[var(--twin-muted-strong)]">{t("hiringJourney.readOnlyNote")}</p>
        </Card>

        {persona === "board" ? (
          <Card
            variant="soft"
            className="border-[var(--twin-accent)]/40 p-4 sm:p-5"
            data-testid={HIRING_JOURNEY_MARKERS.boardBlocked}
          >
            <p className="text-xs font-medium text-[var(--twin-accent)]">{t("hiringJourney.overallBlocked")}</p>
            <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("hiringJourney.boardBlockedNote")}</p>
          </Card>
        ) : null}

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={HIRING_JOURNEY_MARKERS.overallStatus}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("hiringJourney.overallStatusTitle")}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("hiringJourney.overallStatusLabel")}</dt>
              <dd className="font-medium">{t(hiringJourneyOverallStatusKey(journey.overallStatus))}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("hiringJourney.blockingPointLabel")}</dt>
              <dd className="font-medium">{t(journey.blockingPointKey)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("hiringJourney.humanReviewLabel")}</dt>
              <dd className="font-medium">{t(journey.humanReviewRequiredKey)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--twin-muted)]">{t("hiringJourney.noAutomaticLabel")}</dt>
              <dd className="font-medium">{t(journey.noAutomaticActionKey)}</dd>
            </div>
            <div data-testid={HIRING_JOURNEY_MARKERS.noLiveAction}>
              <dt className="text-xs text-[var(--twin-muted)]">{t("hiringJourney.noLiveActionLabel")}</dt>
              <dd className="font-medium">{t("hiringJourney.noLiveActionTaken")}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[var(--twin-muted)]">{t("hiringJourney.overallStatusNote")}</p>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={HIRING_JOURNEY_MARKERS.timeline}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("hiringJourney.timelineTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("hiringJourney.timelineLead")}</p>
          <ol className="mt-4 space-y-4">
            {journey.steps.map((step) => (
              <li
                key={step.id}
                className="rounded border border-[var(--twin-border)]/60 p-4 text-xs"
                data-testid={`hiring-journey-step-${step.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--twin-accent)]">
                      {t("hiringJourney.stepOrder").replace("{order}", String(step.order))}
                    </span>
                    <h3 className="text-sm font-semibold">{t(step.titleKey)}</h3>
                  </div>
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                    {t(hiringJourneyStepStatusKey(step.status))}
                  </span>
                </div>
                <p className="mt-2 text-[var(--twin-muted-strong)]">{t(step.descriptionKey)}</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] uppercase text-[var(--twin-muted)]">{t("hiringJourney.stepOwnerLabel")}</dt>
                    <dd>{t(hiringJourneyOwnerKey(step.owner))}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-[var(--twin-muted)]">
                      {t("hiringJourney.stepSourceModuleLabel")}
                    </dt>
                    <dd>{t(step.sourceModuleKey)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase text-[var(--twin-muted)]">
                      {t("hiringJourney.stepEvidenceLabel")}
                    </dt>
                    <dd>{t(step.evidenceSummaryKey)}</dd>
                  </div>
                  {step.blockerKey ? (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase text-[var(--twin-accent)]">
                        {t("hiringJourney.stepBlockerLabel")}
                      </dt>
                      <dd>{t(step.blockerKey)}</dd>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase text-[var(--twin-muted)]">
                      {t("hiringJourney.stepNextActionLabel")}
                    </dt>
                    <dd>{t(step.nextSafeActionKey)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] uppercase text-[var(--twin-muted)]">
                      {t("hiringJourney.stepSafetyLabel")}
                    </dt>
                    <dd className="text-[var(--twin-muted)]">{t(step.safetyBoundaryKey)}</dd>
                  </div>
                </dl>
                <Link
                  href={step.href}
                  className="twin-link mt-3 inline-block text-xs font-medium"
                  data-hiring-journey-nav="source-module"
                >
                  {t("hiringJourney.stepOpenModule")} →
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={HIRING_JOURNEY_MARKERS.blockedActions}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-accent)]">
            {t("hiringJourney.blockedActionsTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("hiringJourney.blockedActionsLead")}</p>
          <ul className="mt-4 space-y-2">
            {journey.blockedActions.map((action) => (
              <li key={action.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                <span className="font-medium">{t(action.labelKey)}</span>
                <p className="mt-1 text-[var(--twin-muted)]">{t(action.reasonKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          variant="soft"
          className="border-[var(--twin-border)]/80 p-5 sm:p-6"
          data-testid={HIRING_JOURNEY_MARKERS.auditSummary}
        >
          <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
            {t("hiringJourney.auditSummaryTitle")}
          </h2>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("hiringJourney.auditSummaryLead")}</p>
          <ul className="mt-4 space-y-2">
            {journey.auditSummary.map((entry) => (
              <li key={entry.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t(entry.labelKey)}</span>
                  <span className="text-[10px] text-[var(--twin-muted)]">{t(entry.timestampLabelKey)}</span>
                </div>
                <p className="mt-1 text-[var(--twin-muted)]">{t(entry.sourceKey)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <nav
          className="flex flex-wrap gap-2"
          data-testid={HIRING_JOURNEY_MARKERS.crossLinks}
          aria-label={t("hiringJourney.crossLinksTitle")}
        >
          {crossLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
