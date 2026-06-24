"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { CalendarReadinessEvidencePanel } from "@/components/shared/calendar-readiness-evidence-panel";
import { MicrosoftCalendarReadinessBusyReadPanel } from "@/components/shared/microsoft-calendar-readiness-busy-read-panel";
import {
  CANDIDATE_CALENDAR_READINESS_MARKERS,
  CANDIDATE_CALENDAR_READINESS_PAGE_MARKER,
  CANDIDATE_CALENDAR_READINESS_SAFE_LINKS,
  calendarReadinessSourceKey,
  resolveCandidateCalendarReadiness,
} from "@/lib/candidate-calendar-readiness";
import type { CalendarReadinessRecord } from "@/lib/calendar-readiness";
import { deriveMicrosoftFromCalendar } from "@/lib/microsoft-calendar-readiness";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={marker}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function stageLabelKey(stage: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    not_started: "candidateCalendarReadiness.stageNotStarted",
    oauth_env_preview: "candidateCalendarReadiness.stageOauthEnvPreview",
    busy_read_preview: "candidateCalendarReadiness.stageBusyReadPreview",
    hold_write_blocked: "candidateCalendarReadiness.stageHoldWriteBlocked",
    readiness_preview: "candidateCalendarReadiness.stageReadinessPreview",
  };
  return map[stage] ?? "candidateCalendarReadiness.stageReadinessPreview";
}

function PreviewNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_CALENDAR_READINESS_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateCalendarReadiness.notFoundTitle")}
          message={t("candidateCalendarReadiness.notFoundMessage")}
          steps={[
            t("candidateCalendarReadiness.notFoundStep1"),
            t("candidateCalendarReadiness.notFoundStep2"),
          ]}
          actionLabel={t("candidateCalendarReadiness.notFoundCta")}
          actionHref={CANDIDATE_CALENDAR_READINESS_SAFE_LINKS.calendar}
        />
      </div>
    </Shell>
  );
}

function PreviewContent({ record }: { record: CalendarReadinessRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div
        data-candidate-calendar-readiness-page={CANDIDATE_CALENDAR_READINESS_PAGE_MARKER}
        data-testid={CANDIDATE_CALENDAR_READINESS_MARKERS.page}
        className="space-y-6"
      >
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_CALENDAR_READINESS_SAFE_LINKS.calendar}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateCalendarReadiness.linkCalendar")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateCalendarReadiness.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_CALENDAR_READINESS_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateCalendarReadiness.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateCalendarReadiness.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
            </div>
            <span
              className="inline-block rounded-full border px-3 py-1 text-xs"
              data-testid={CANDIDATE_CALENDAR_READINESS_MARKERS.sourceBadge}
            >
              {t(calendarReadinessSourceKey(record.source))}
            </span>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_CALENDAR_READINESS_MARKERS.stage,
          t("candidateCalendarReadiness.stageTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateCalendarReadiness.stageLead")}</p>
            <p className="font-medium">{t(stageLabelKey(record.readiness_stage))}</p>
          </>,
        )}

        <MicrosoftCalendarReadinessBusyReadPanel record={deriveMicrosoftFromCalendar(record)} />

        {sectionCard(
          CANDIDATE_CALENDAR_READINESS_MARKERS.providers,
          t("candidateCalendarReadiness.providersTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateCalendarReadiness.providersLead")}</p>
            <ul className="space-y-2">
              {record.providers.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                  <span className="font-medium">{row.provider}</span>
                  <span className="ml-2 text-[var(--twin-muted)]">
                    · {row.oauth_status} · busy {row.busy_read} · write {row.event_write}
                  </span>
                  <p className="mt-1 text-[var(--twin-muted)]">{row.note}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CALENDAR_READINESS_MARKERS.publicHealth,
          t("candidateCalendarReadiness.publicHealthTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateCalendarReadiness.publicHealthLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidateCalendarReadiness.googleConfigured")}</dt>
                <dd className="font-medium">
                  {record.public_health.google_calendar_configured
                    ? t("candidateCalendarReadiness.flagYes")
                    : t("candidateCalendarReadiness.flagNo")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidateCalendarReadiness.microsoftConfigured")}</dt>
                <dd className="font-medium">
                  {record.public_health.microsoft_calendar_configured
                    ? t("candidateCalendarReadiness.flagYes")
                    : t("candidateCalendarReadiness.flagNo")}
                </dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CALENDAR_READINESS_MARKERS.scopes,
          t("candidateCalendarReadiness.scopesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateCalendarReadiness.scopesLead")}</p>
            <p className="font-mono text-xs">{record.scopes_preview.join(" · ")}</p>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CALENDAR_READINESS_MARKERS.blocked,
          t("candidateCalendarReadiness.blockedTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateCalendarReadiness.blockedLead")}</p>
            <ul className="space-y-2">
              {record.blocked_capabilities.map((cap) => (
                <li key={cap.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                  <span className="font-medium">{cap.label}</span>
                  <p className="mt-1 text-[var(--twin-muted)]">{cap.reason}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        <CalendarReadinessEvidencePanel candidateId={record.candidate_id} />

        <div data-testid={CANDIDATE_CALENDAR_READINESS_MARKERS.safeLinks} className="text-xs text-[var(--twin-muted)]">
          {t("candidateCalendarReadiness.boundaryNote")}
        </div>
      </div>
    </Shell>
  );
}

export function CandidateCalendarReadinessWorkspace() {
  const record = resolveCandidateCalendarReadiness();
  if (!record) return <PreviewNotFound />;
  return <PreviewContent record={record} />;
}
