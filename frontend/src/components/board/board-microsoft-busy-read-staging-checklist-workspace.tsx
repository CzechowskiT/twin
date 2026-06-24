"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { MicrosoftBusyReadStagingStatusBanner } from "@/components/shared/microsoft-busy-read-staging-status-banner";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import {
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_LINKS,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS,
  BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER,
  LAUNCH_STANCE,
  resolveBoardMicrosoftBusyReadStagingChecklist,
} from "@/lib/board-microsoft-busy-read-staging-checklist";
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

function statusLabel(status: string, t: (key: TranslationKey) => string): string {
  const key = `boardMicrosoftBusyReadStagingChecklist.status${status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}` as TranslationKey;
  return t(key);
}

export function BoardMicrosoftBusyReadStagingChecklistWorkspace() {
  const { t } = useTranslation();
  const record = resolveBoardMicrosoftBusyReadStagingChecklist();

  return (
    <Shell wide>
      <div
        data-board-microsoft-busy-read-staging-checklist-page={
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER
        }
        data-testid={BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("boardMicrosoftBusyReadStagingChecklist.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">
            {t("boardMicrosoftBusyReadStagingChecklist.pageTitle")}
          </h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">
            {t("boardMicrosoftBusyReadStagingChecklist.headerLead")}
          </p>
          <span
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("boardMicrosoftBusyReadStagingChecklist.pilotBadge")}
          </span>
        </header>

        <MicrosoftBusyReadStagingStatusBanner />

        {section(
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.prodGates,
          t("boardMicrosoftBusyReadStagingChecklist.prodGatesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted)]">
              {t("boardMicrosoftBusyReadStagingChecklist.prodGatesLead")}
            </p>
            <ul className="space-y-2">
              {record.prodGatesOff.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">
                    {t(`boardMicrosoftBusyReadStagingChecklist.${row.labelKey}` as TranslationKey)}
                  </span>
                  <span className="ml-2 uppercase text-[var(--twin-accent)]">{statusLabel(row.status, t)}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">
                    {t(`boardMicrosoftBusyReadStagingChecklist.${row.detailKey}` as TranslationKey)}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.smokeCommands,
          t("boardMicrosoftBusyReadStagingChecklist.smokeCommandsTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted)]">
              {t("boardMicrosoftBusyReadStagingChecklist.smokeCommandsLead")}
            </p>
            <ul className="space-y-2">
              {record.smokeCommands.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">
                    {t(`boardMicrosoftBusyReadStagingChecklist.${row.labelKey}` as TranslationKey)}
                  </span>
                  <span className="ml-2 text-[var(--twin-muted)]">{row.mode.replace("_", " ")}</span>
                  <p className="mt-1 font-mono text-[10px] text-[var(--twin-muted-strong)]">{row.command}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.uiExpectations,
          t("boardMicrosoftBusyReadStagingChecklist.uiExpectationsTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted)]">
              {t("boardMicrosoftBusyReadStagingChecklist.uiExpectationsLead")}
            </p>
            <ul className="space-y-2">
              {record.uiExpectations.map((row) => (
                <li key={row.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">
                    {t(`boardMicrosoftBusyReadStagingChecklist.${row.labelKey}` as TranslationKey)}
                  </span>
                  <span className="ml-2 uppercase text-[var(--twin-accent)]">{statusLabel(row.status, t)}</span>
                  <p className="mt-1 text-[var(--twin-muted-strong)]">
                    {t(`boardMicrosoftBusyReadStagingChecklist.${row.detailKey}` as TranslationKey)}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.hardBans,
          t("boardMicrosoftBusyReadStagingChecklist.hardBansTitle"),
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {record.hardBans.map((ban) => (
              <li key={ban}>{t(`boardMicrosoftBusyReadStagingChecklist.ban_${ban}` as TranslationKey)}</li>
            ))}
          </ul>,
        )}

        <OperationalCrossLinksPanel />

        {section(
          BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.launch,
          t("productionPersistenceStatus.launchTitle"),
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>{t("productionPersistenceStatus.launchPublic")}</li>
            <li>{t("productionPersistenceStatus.launchP0")}</li>
            <li>{t("productionPersistenceStatus.launchPhase3B")}</li>
          </ul>,
        )}

        <nav
          className="flex flex-wrap gap-2 text-xs"
          data-testid={BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS.crossLinks}
          aria-label={t("liveOperatingState.crossLinksTitle")}
        >
          {BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_LINKS.map((link) => (
            <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
