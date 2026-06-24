"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperatingEvidencePanel } from "@/components/shared/operating-evidence-panel";
import { ReadOnlyCapabilityMatrix } from "@/components/shared/read-only-capability-matrix";
import {
  CALENDAR_READINESS_EVIDENCE_CROSS_LINKS,
  CALENDAR_READINESS_EVIDENCE_MARKERS,
  resolveCalendarReadinessEvidence,
} from "@/lib/calendar-readiness-evidence";

type Props = {
  candidateId?: string;
};

export function CalendarReadinessEvidencePanel({ candidateId }: Props): ReactNode {
  const { t } = useTranslation();
  const bundle = resolveCalendarReadinessEvidence(candidateId);

  return (
    <OperatingEvidencePanel
      titleKey="calendarReadinessEvidence.panelTitle"
      leadKey="calendarReadinessEvidence.panelLead"
      boundaryKey="calendarReadinessEvidence.boundaryNote"
      snapshot={bundle?.snapshot ?? null}
      crossLinks={CALENDAR_READINESS_EVIDENCE_CROSS_LINKS}
      testId={CALENDAR_READINESS_EVIDENCE_MARKERS.panel}
    >
      {bundle ? (
        <>
          <div data-testid={CALENDAR_READINESS_EVIDENCE_MARKERS.oauthStatus}>
            <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("calendarReadinessEvidence.oauthStatusTitle")}
            </p>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidateCalendarReadiness.googleConfigured")}</dt>
                <dd className="font-medium">
                  {bundle.record.public_health.google_calendar_configured
                    ? t("candidateCalendarReadiness.flagYes")
                    : t("candidateCalendarReadiness.flagNo")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidateCalendarReadiness.microsoftConfigured")}</dt>
                <dd className="font-medium">
                  {bundle.record.public_health.microsoft_calendar_configured
                    ? t("candidateCalendarReadiness.flagYes")
                    : t("candidateCalendarReadiness.flagNo")}
                </dd>
              </div>
            </dl>
          </div>

          <div data-testid={CALENDAR_READINESS_EVIDENCE_MARKERS.readinessStatus}>
            <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
              {t("calendarReadinessEvidence.readinessStatusTitle")}
            </p>
            <p className="mt-1 text-xs font-medium">{bundle.record.headline}</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--twin-muted)]">
              {t("calendarReadinessEvidence.readinessStageLabel")}: {bundle.record.readiness_stage}
            </p>
          </div>

          <ReadOnlyCapabilityMatrix
            rows={bundle.capabilities}
            testId={CALENDAR_READINESS_EVIDENCE_MARKERS.capabilityMatrix}
          />
        </>
      ) : null}
    </OperatingEvidencePanel>
  );
}
