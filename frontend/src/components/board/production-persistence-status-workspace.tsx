"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import {
  LAUNCH_STANCE,
  PRODUCTION_PERSISTENCE_STATUS_LINKS,
  PRODUCTION_PERSISTENCE_STATUS_MARKERS,
  PRODUCTION_PERSISTENCE_STATUS_PAGE_MARKER,
  resolveProductionPersistenceStatus,
} from "@/lib/production-persistence-status";
import type { TranslationKey } from "@/lib/i18n";

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

export function ProductionPersistenceStatusWorkspace() {
  const { t } = useTranslation();
  const record = resolveProductionPersistenceStatus();

  return (
    <Shell wide>
      <div
        data-production-persistence-status-page={PRODUCTION_PERSISTENCE_STATUS_PAGE_MARKER}
        data-testid={PRODUCTION_PERSISTENCE_STATUS_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={PRODUCTION_PERSISTENCE_STATUS_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("productionPersistenceStatus.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("productionPersistenceStatus.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.headerLead")}</p>
          <span
            data-testid={PRODUCTION_PERSISTENCE_STATUS_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("productionPersistenceStatus.pilotBadge")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {PRODUCTION_PERSISTENCE_STATUS_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.healthSummary,
          t("productionPersistenceStatus.healthSummaryTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.healthSummaryLead")}</p>
            <p className="font-mono text-xs">{record.healthUrl}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("productionPersistenceStatus.healthFieldsNote")}</p>
          </>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.commitInterpretation,
          t("productionPersistenceStatus.commitInterpretationTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.commitInterpretationLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>{t("productionPersistenceStatus.commitFieldFrontend")}</li>
              <li>{t("productionPersistenceStatus.commitFieldApi")}</li>
              <li>{t("productionPersistenceStatus.commitFieldScaffold")}</li>
              <li>{t("productionPersistenceStatus.commitAlignedEnough")}</li>
            </ul>
          </>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.migrationChecklist,
          t("productionPersistenceStatus.migrationTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">
              {t("productionPersistenceStatus.migrationLead")} <code>{record.expectedAlembicHead}</code>
            </p>
            <ul className="space-y-2">
              {record.migrationChecks.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">{row.label}</span>
                  <span className="ml-2 uppercase text-[var(--twin-accent)]">{row.status.replace("_", " ")}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">{row.detail}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.authSmokeReadiness,
          t("productionPersistenceStatus.authSmokeTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("productionPersistenceStatus.authSmokeLead")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{record.authSmokeSkipReason}</p>
            <pre className="overflow-x-auto rounded bg-[var(--twin-surface)] p-2 font-mono text-[10px]">
              {record.authSmokeCommand}
            </pre>
          </>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.verificationStatus,
          t("productionPersistenceStatus.verificationStatusTitle"),
          <>
            <ul className="space-y-2">
              {record.verificationStatus.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">{row.label}</span>
                  <span className="ml-2 uppercase text-[var(--twin-accent)]">{row.status.replace("_", " ")}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">{row.detail}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.endpointMatrix,
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
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.limitations,
          t("productionPersistenceStatus.limitationsTitle"),
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {record.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.nextAction,
          t("productionPersistenceStatus.nextActionTitle"),
          <ol className="list-decimal space-y-1 pl-4 text-xs">
            {record.nextOperatorActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>,
        )}

        {section(
          PRODUCTION_PERSISTENCE_STATUS_MARKERS.launch,
          t("productionPersistenceStatus.launchTitle"),
          <>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>{t("productionPersistenceStatus.launchPublic")}</li>
              <li>{t("productionPersistenceStatus.launchP0")}</li>
              <li>{t("productionPersistenceStatus.launchPhase3B")}</li>
            </ul>
          </>,
        )}

        <OperationalCrossLinksPanel />
      </div>
    </Shell>
  );
}
