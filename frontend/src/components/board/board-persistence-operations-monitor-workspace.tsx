"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { LiveOperatingStatePanel } from "@/components/shared/live-operating-state-panel";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import {
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_LINKS,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  loadBoardOperatingState,
  loadPublicHealthSnapshot,
  resolveBoardPersistenceOperationsMonitor,
  type BoardOperatingState,
  type PublicHealthSnapshot,
} from "@/lib/board-persistence-operations-monitor";

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

export function BoardPersistenceOperationsMonitorWorkspace() {
  const { t } = useTranslation();
  const record = useMemo(() => resolveBoardPersistenceOperationsMonitor(), []);
  const crossLinks = useMemo(() => BOARD_PERSISTENCE_OPERATIONS_MONITOR_LINKS, []);
  const [state, setState] = useState<BoardOperatingState | null>(null);
  const [health, setHealth] = useState<PublicHealthSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    void loadBoardOperatingState().then((res) => {
      if (active) setState(res);
    });
    void loadPublicHealthSnapshot().then((res) => {
      if (active) setHealth(res);
    });
    return () => {
      active = false;
    };
  }, []);

  const healthSourceKey =
    health?.source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";

  return (
    <Shell wide>
      <div
        data-board-persistence-operations-monitor-page={BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER}
        data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("liveOperatingState.monitorTitle")}
          </p>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("liveOperatingState.monitorLead")}</p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("productionPersistenceStatus.pilotBadge")}
          </span>
        </header>

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.publicHealth,
          t("productionPersistenceStatus.healthSummaryTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.healthSummaryLead")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t(healthSourceKey)}</p>
            {health ? (
              <ul className="space-y-1 font-mono text-[10px]">
                <li>status: {health.status}</li>
                <li>db_ok: {String(health.db_ok)}</li>
                <li>frontend_commit: {health.frontend_commit}</li>
                <li>api_commit: {health.api_commit}</li>
                <li>{health.commit_interpretation}</li>
              </ul>
            ) : (
              <p className="text-xs">{t("liveOperatingState.loading")}</p>
            )}
          </>,
        )}

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.alembic,
          t("productionPersistenceStatus.migrationTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">
              {t("productionPersistenceStatus.migrationLead")}{" "}
              <code>{record.expectedAlembicHead}</code>
            </p>
            <p className="text-xs text-[var(--twin-accent)]">{record.alembicEvidence}</p>
          </>,
        )}

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.authSmoke,
          t("productionPersistenceStatus.authSmokeTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.authSmokeLead")}</p>
            <p className="font-mono text-xs">
              {record.authSmoke.pass} pass / {record.authSmoke.fail} fail / {record.authSmoke.skip} skip
            </p>
            <p className="text-xs text-[var(--twin-muted)]">{record.authSmoke.detail}</p>
          </>,
        )}

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.endpointMatrix,
          t("productionPersistenceStatus.endpointMatrixTitle"),
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--twin-border)]/60 text-[var(--twin-muted)]">
                    <th className="py-1 pr-2">{t("productionPersistenceStatus.colPath")}</th>
                    <th className="py-1 pr-2">{t("productionPersistenceStatus.colMethods")}</th>
                    <th className="py-1 pr-2">{t("productionPersistenceStatus.colUnauth")}</th>
                    <th className="py-1">{t("productionPersistenceStatus.colSmoke")}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.endpoints.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
                      <td className="py-1 pr-2 font-mono">{row.path}</td>
                      <td className="py-1 pr-2">{row.methods}</td>
                      <td className="py-1 pr-2">{row.unauthExpected}</td>
                      <td className="py-1">{row.authSmoke}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>,
        )}

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.operationalSurfaces,
          t("liveOperatingState.operationalSurfacesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("liveOperatingState.operationalSurfacesLead")}</p>
            <ul className="space-y-2">
              {record.operationalSurfaces.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-mono">{row.route}</span>
                  <span className="ml-2 text-[var(--twin-muted)]">{row.persona}</span>
                  <span className="ml-2 uppercase text-[var(--twin-accent)]">{row.status.replace("_", " ")}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">{row.channels}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        <LiveOperatingStatePanel
          titleKey="recruiterDailyCockpit.operatingStateTitle"
          leadKey="recruiterDailyCockpit.operatingStateLead"
          summary={state?.recruiter ?? null}
          testId={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.recruiterPanel}
        />

        <LiveOperatingStatePanel
          titleKey="companyHiringCommandCenter.operatingStateTitle"
          leadKey="companyHiringCommandCenter.operatingStateLead"
          summary={state?.company ?? null}
          testId={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.companyPanel}
        />

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.blockedCapabilities,
          t("liveOperatingState.blockedCapabilitiesTitle"),
          <>
            <ul className="space-y-2">
              {record.blockedCapabilities.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">{row.label}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">{row.reason}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        <CompactAuditTrailWidget />

        <OperationalCrossLinksPanel />

        {section(
          BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.launch,
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
          data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.crossLinks}
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
