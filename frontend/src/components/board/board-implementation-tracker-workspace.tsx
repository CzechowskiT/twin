"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { BoardPersistenceStateSections } from "@/components/board/board-persistence-state-sections";
import {
  LAUNCH_STANCE,
  BOARD_IMPLEMENTATION_TRACKER_LINKS,
  BOARD_IMPLEMENTATION_TRACKER_MARKERS,
  BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER,
  getImplementationTrackerOwners,
  resolveImplementationTracker,
  type ImplementationFeatureRow,
} from "@/lib/board-implementation-tracker";
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

function featureTable(rows: ImplementationFeatureRow[], t: (k: TranslationKey) => string): ReactNode {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--twin-border)]/60 text-[10px] uppercase text-[var(--twin-muted)]">
            <th className="py-2 pr-2">{t("implementationTracker.colName")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colState")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colNext")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colDependency")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colBoundary")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colOwner")}</th>
            <th className="py-2 pr-2">{t("implementationTracker.colPriority")}</th>
            <th className="py-2">{t("implementationTracker.colBlocked")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
              <td className="py-2 pr-2 font-medium">{t(row.name_key as TranslationKey)}</td>
              <td className="py-2 pr-2 uppercase">{row.state}</td>
              <td className="py-2 pr-2 text-[var(--twin-muted-strong)]">{t(row.next_key as TranslationKey)}</td>
              <td className="py-2 pr-2 text-[var(--twin-muted-strong)]">{t(row.dependency_key as TranslationKey)}</td>
              <td className="py-2 pr-2 text-[var(--twin-muted-strong)]">{t(row.boundary_key as TranslationKey)}</td>
              <td className="py-2 pr-2">{row.owner}</td>
              <td className="py-2 pr-2">{row.priority}</td>
              <td className="py-2">{row.blocked ? t("implementationTracker.yesBlocked") : t("implementationTracker.noBlocked")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BoardImplementationTrackerWorkspace() {
  const { t } = useTranslation();
  const record = resolveImplementationTracker();
  const owners = getImplementationTrackerOwners();

  return (
    <Shell wide>
      <div
        data-board-implementation-tracker-page={BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER}
        data-testid={BOARD_IMPLEMENTATION_TRACKER_MARKERS.page}
        className="mx-auto max-w-6xl space-y-6"
      >
        <header data-testid={BOARD_IMPLEMENTATION_TRACKER_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("implementationTracker.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("implementationTracker.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("implementationTracker.headerLead")}</p>
          <span
            data-testid={BOARD_IMPLEMENTATION_TRACKER_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("implementationTracker.pilotBadge")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {BOARD_IMPLEMENTATION_TRACKER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.persistenceFeatures,
          t("implementationTracker.persistenceTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.persistenceLead")}</p>
            {featureTable(record.persistence_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.queueFeatures,
          t("implementationTracker.queueTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.queueLead")}</p>
            {featureTable(record.queue_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.exportFeatures,
          t("implementationTracker.exportTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.exportLead")}</p>
            {featureTable(record.export_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.intakeFeatures,
          t("implementationTracker.intakeTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.intakeLead")}</p>
            {featureTable(record.intake_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.emailFeatures,
          t("implementationTracker.emailTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.emailLead")}</p>
            {featureTable(record.email_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.atsFeatures,
          t("implementationTracker.atsTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.atsLead")}</p>
            {featureTable(record.ats_features, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.dependencyMap,
          t("implementationTracker.dependencyTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.dependencyLead")}</p>
            {featureTable(record.dependency_rows, t)}
          </>,
        )}

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.ownerSummary,
          t("implementationTracker.ownerTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.ownerLead")}</p>
            <ul className="flex flex-wrap gap-2 text-xs">
              {owners.map((owner) => (
                <li key={owner} className="rounded-full border border-[var(--twin-border)] px-3 py-1">
                  {owner}
                </li>
              ))}
            </ul>
          </>,
        )}

        <BoardPersistenceStateSections
          shippedTitle={t("boardPersistenceState.shippedTitle")}
          blockedTitle={t("boardPersistenceState.blockedTitle")}
        />

        {section(
          BOARD_IMPLEMENTATION_TRACKER_MARKERS.blockedRegister,
          t("implementationTracker.blockedTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.blockedLead")}</p>
            {featureTable(record.blocked_rows, t)}
            <div className="mt-4 space-y-1 border-t border-[var(--twin-border)]/60 pt-3 text-xs">
              <p>{t("implementationTracker.launchNoGo")}</p>
              <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.p0Open")}</p>
              <p className="text-[var(--twin-muted-strong)]">{t("implementationTracker.phase3bBlocked")}</p>
            </div>
          </>,
        )}
      </div>
    </Shell>
  );
}
