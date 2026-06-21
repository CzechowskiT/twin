"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { PlacementEventsTimeline } from "@/components/shared/placement-events-timeline";
import { Card, Shell } from "@/components/ui";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import {
  BOARD_PLACEMENT_EVIDENCE_MONITOR_LINKS,
  BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS,
  BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER,
  placementVerificationSourceKey,
  resolveBoardPlacementEvidenceMonitor,
} from "@/lib/board-placement-evidence-monitor";

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

export function BoardPlacementEvidenceMonitorWorkspace() {
  const { t } = useTranslation();
  const record = resolveBoardPlacementEvidenceMonitor();

  return (
    <Shell wide>
      <div
        data-board-placement-evidence-monitor-page={BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER}
        data-testid={BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("boardPlacementEvidence.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("boardPlacementEvidence.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("boardPlacementEvidence.headerLead")}</p>
          <p className="font-mono text-xs text-[var(--twin-muted)]">{record.placement_id}</p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-testid={BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.sourceBadge}>
            {t(placementVerificationSourceKey("demo"))}
          </span>
          <span className="ml-2 inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("boardPlacementEvidence.pilotBadge")}
          </span>
        </header>

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.evidenceMatrix,
          t("boardPlacementEvidence.evidenceMatrixTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("boardPlacementEvidence.evidenceMatrixLead")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--twin-border)]/60 text-[var(--twin-muted)]">
                    <th className="py-1 pr-2">{t("boardPlacementEvidence.colPersona")}</th>
                    <th className="py-1 pr-2">{t("boardPlacementEvidence.colRoute")}</th>
                    <th className="py-1 pr-2">{t("boardPlacementEvidence.colKind")}</th>
                    <th className="py-1">{t("boardPlacementEvidence.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.evidence_matrix.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
                      <td className="py-1 pr-2">{row.persona}</td>
                      <td className="py-1 pr-2 font-mono">{row.route}</td>
                      <td className="py-1 pr-2">{row.evidence_kind}</td>
                      <td className="py-1 uppercase text-[var(--twin-accent)]">{row.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>,
        )}

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.economicsPreview,
          t("boardPlacementEvidence.economicsTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("boardPlacementEvidence.economicsLead")}</p>
            <p className="text-xs text-[var(--twin-accent)]">{record.economics_note}</p>
          </>,
        )}

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.riskFlags,
          t("boardPlacementEvidence.riskTitle"),
          <>
            <ul className="space-y-2">
              {record.risk_flags.map((flag) => (
                <li key={flag.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium uppercase text-[var(--twin-accent)]">{flag.severity}</span>
                  <p className="mt-1 font-medium">{flag.label}</p>
                  <p className="text-[var(--twin-muted)]">{flag.detail}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.blockedCapabilities,
          t("boardPlacementEvidence.blockedTitle"),
          <>
            <ul className="space-y-2">
              {record.blocked_capabilities.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">{row.label}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">{row.reason}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        <CompactAuditTrailWidget />

        <PlacementEventsTimeline placementId={record.placement_id} />

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.personaRoutes,
          t("boardPlacementEvidence.personaRoutesTitle"),
          <>
            <ul className="space-y-2">
              {record.persona_routes.map((row) => (
                <li key={row.id}>
                  <Link href={row.route} className="twin-link font-mono text-xs">
                    {row.route}
                  </Link>
                  <span className="ml-2 text-[var(--twin-muted)]">{row.persona}</span>
                </li>
              ))}
            </ul>
          </>,
        )}

        <OperationalCrossLinksPanel />

        {section(
          BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.launch,
          t("productionPersistenceStatus.launchTitle"),
          <>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>{t("productionPersistenceStatus.launchPublic")}</li>
              <li>{t("productionPersistenceStatus.launchP0")}</li>
              <li>{t("productionPersistenceStatus.launchPhase3B")}</li>
            </ul>
          </>,
        )}

        <nav
          className="flex flex-wrap gap-2 text-xs"
          data-testid={BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS.crossLinks}
          aria-label={t("liveOperatingState.crossLinksTitle")}
        >
          {BOARD_PLACEMENT_EVIDENCE_MONITOR_LINKS.map((link) => (
            <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
