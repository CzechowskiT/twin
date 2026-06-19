"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  CANDIDATE_VISIBILITY_PREFERENCE_DEMO_FIELDS,
  CANDIDATE_VISIBILITY_PREFERENCES_MARKERS,
  CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER,
  LAUNCH_STANCE,
  candidateVisibilityPreferencesHref,
} from "@/lib/candidate-visibility-preferences";
import { candidateControlCenterHref } from "@/lib/candidate-control-center";
import type { TranslationKey } from "@/lib/i18n";

export function CandidateVisibilityPreferencesWorkspace() {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div
        data-candidate-visibility-preferences-page={CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER}
        data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.page}
        className="mx-auto max-w-4xl space-y-6"
      >
        <header data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("candidateVisibilityPreferences.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("candidateVisibilityPreferences.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateVisibilityPreferences.headerLead")}</p>
          <span
            data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("candidateVisibilityPreferences.pilotBadge")}
          </span>
          <Link
            href={candidateControlCenterHref()}
            data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.controlCenterLink}
            className="twin-link block text-xs"
          >
            {t("candidateVisibilityPreferences.linkControlCenter")}
          </Link>
        </header>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.fields}>
            <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("candidateVisibilityPreferences.fieldsTitle")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {CANDIDATE_VISIBILITY_PREFERENCE_DEMO_FIELDS.map((field) => (
                <li key={field.id} className="flex justify-between rounded border px-3 py-2 text-xs">
                  <span>{t(field.labelKey)}</span>
                  <span className="font-mono text-[var(--twin-muted)]">{field.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.persistenceNote}>
            <p className="text-sm">{t("candidateVisibilityPreferences.persistenceLead")}</p>
            <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("candidateVisibilityPreferences.apiNote")}</p>
          </div>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
          <div data-testid={CANDIDATE_VISIBILITY_PREFERENCES_MARKERS.boundary}>
            <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("candidateVisibilityPreferences.boundaryTitle")}
            </h2>
            <ul className="mt-3 list-inside list-disc text-xs">
              {(
                [
                  "candidateVisibilityPreferences.boundaryNoExternal",
                  "candidateVisibilityPreferences.boundaryNoEmail",
                  "candidateVisibilityPreferences.boundaryNoAts",
                  "candidateVisibilityPreferences.boundaryHumanReview",
                ] as const
              ).map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
