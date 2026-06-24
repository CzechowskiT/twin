"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { MicrosoftCalendarReadinessBusyReadPanel } from "@/components/shared/microsoft-calendar-readiness-busy-read-panel";
import { MicrosoftBusySlotPreviewPanel } from "@/components/shared/microsoft-busy-slot-preview-panel";
import { MicrosoftOAuthConnectUiGate } from "@/components/shared/microsoft-oauth-connect-ui-gate";
import { MicrosoftBusyReadCrossLinkCard } from "@/components/shared/microsoft-busy-read-cross-link-card";
import { Card, Shell } from "@/components/ui";
import {
  BOARD_CALENDAR_READINESS_MONITOR_LINKS,
  BOARD_CALENDAR_READINESS_MONITOR_MARKERS,
  BOARD_CALENDAR_READINESS_MONITOR_PAGE_MARKER,
  resolveBoardCalendarReadinessMonitor,
} from "@/lib/board-calendar-readiness-monitor";
import { resolveMicrosoftCalendarReadiness } from "@/lib/microsoft-calendar-readiness";
import { resolveMicrosoftBusyRead } from "@/lib/microsoft-busy-read";

function section(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
        <div className="mt-3 space-y-2 text-sm">{children}</div>
      </div>
    </Card>
  );
}

export function BoardCalendarReadinessMonitorWorkspace() {
  const { t } = useTranslation();
  const record = useMemo(() => resolveBoardCalendarReadinessMonitor(), []);
  const microsoftRecord = useMemo(() => resolveMicrosoftCalendarReadiness(), []);
  const busyReadRecord = useMemo(() => resolveMicrosoftBusyRead(), []);
  const crossLinks = useMemo(() => BOARD_CALENDAR_READINESS_MONITOR_LINKS, []);

  return (
    <Shell wide>
      <div
        data-board-calendar-readiness-monitor-page={BOARD_CALENDAR_READINESS_MONITOR_PAGE_MARKER}
        data-testid={BOARD_CALENDAR_READINESS_MONITOR_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_CALENDAR_READINESS_MONITOR_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("boardCalendarReadiness.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("boardCalendarReadiness.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
          <p className="text-xs text-[var(--twin-muted)]">{t("boardCalendarReadiness.headerLead")}</p>
        </header>

        {microsoftRecord ? (
          <MicrosoftCalendarReadinessBusyReadPanel record={microsoftRecord} />
        ) : null}

        {busyReadRecord ? (
          <>
            <MicrosoftBusySlotPreviewPanel record={busyReadRecord} />
            <MicrosoftOAuthConnectUiGate record={busyReadRecord} />
            <MicrosoftBusyReadCrossLinkCard context="board" candidateId={busyReadRecord.candidate_id} />
          </>
        ) : null}

        {section(
          BOARD_CALENDAR_READINESS_MONITOR_MARKERS.providerMatrix,
          t("boardCalendarReadiness.providerMatrixTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted)]">{t("boardCalendarReadiness.providerMatrixLead")}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--twin-muted)]">
                  <th className="py-1">{t("boardCalendarReadiness.colProvider")}</th>
                  <th className="py-1">{t("boardCalendarReadiness.colOauth")}</th>
                  <th className="py-1">{t("boardCalendarReadiness.colBusy")}</th>
                  <th className="py-1">{t("boardCalendarReadiness.colWrite")}</th>
                </tr>
              </thead>
              <tbody>
                {record.providers.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--twin-border)]/40">
                    <td className="py-1 font-medium">{row.provider}</td>
                    <td className="py-1">{row.oauth_status}</td>
                    <td className="py-1">{row.busy_read}</td>
                    <td className="py-1">{row.event_write}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>,
        )}

        {section(
          BOARD_CALENDAR_READINESS_MONITOR_MARKERS.publicHealth,
          t("boardCalendarReadiness.publicHealthTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted)]">{t("boardCalendarReadiness.publicHealthLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--twin-muted)]">google_calendar_configured</dt>
                <dd>{String(record.public_health.google_calendar_configured)}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">microsoft_calendar_configured</dt>
                <dd>{String(record.public_health.microsoft_calendar_configured)}</dd>
              </div>
            </dl>
          </>,
        )}

        {section(
          BOARD_CALENDAR_READINESS_MONITOR_MARKERS.blockedCapabilities,
          t("boardCalendarReadiness.blockedTitle"),
          <ul className="space-y-2 text-xs">
            {record.blocked_capabilities.map((cap) => (
              <li key={cap.id} className="rounded border border-[var(--twin-border)]/60 p-2">
                <span className="font-medium">{cap.label}</span>
                <p className="mt-1 text-[var(--twin-muted)]">{cap.reason}</p>
              </li>
            ))}
          </ul>,
        )}

        {section(
          BOARD_CALENDAR_READINESS_MONITOR_MARKERS.personaRoutes,
          t("boardCalendarReadiness.personaRoutesTitle"),
          <ul className="space-y-1 text-xs">
            {record.persona_routes.map((row) => (
              <li key={row.id}>
                <Link href={row.route} className="twin-link">
                  {row.persona}
                </Link>
                <span className="ml-2 text-[var(--twin-muted)]">{row.route}</span>
              </li>
            ))}
          </ul>,
        )}

        <OperationalCrossLinksPanel />

        {section(
          BOARD_CALENDAR_READINESS_MONITOR_MARKERS.launch,
          t("productionPersistenceStatus.launchTitle"),
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>{t("productionPersistenceStatus.launchPublic")}</li>
            <li>{t("productionPersistenceStatus.launchP0")}</li>
            <li>{t("productionPersistenceStatus.launchPhase3B")}</li>
          </ul>,
        )}

        <nav
          className="flex flex-wrap gap-2 text-xs"
          data-testid={BOARD_CALENDAR_READINESS_MONITOR_MARKERS.crossLinks}
          aria-label={t("liveOperatingState.crossLinksTitle")}
        >
          {crossLinks.map((link) => (
            <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
