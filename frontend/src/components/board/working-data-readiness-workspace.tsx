"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { BoardPersistenceStateSections } from "@/components/board/board-persistence-state-sections";
import {
  LAUNCH_STANCE,
  WORKING_DATA_READINESS_LINKS,
  WORKING_DATA_READINESS_MARKERS,
  WORKING_DATA_READINESS_PAGE_MARKER,
  resolveWorkingDataReadiness,
} from "@/lib/working-data-readiness";
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

export function WorkingDataReadinessWorkspace() {
  const { t } = useTranslation();
  const record = resolveWorkingDataReadiness();

  return (
    <Shell wide>
      <div
        data-working-data-readiness-page={WORKING_DATA_READINESS_PAGE_MARKER}
        data-testid={WORKING_DATA_READINESS_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={WORKING_DATA_READINESS_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("workingDataReadiness.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("workingDataReadiness.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("workingDataReadiness.headerLead")}</p>
          <span
            data-testid={WORKING_DATA_READINESS_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("workingDataReadiness.pilotBadge")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {WORKING_DATA_READINESS_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          WORKING_DATA_READINESS_MARKERS.entities,
          t("workingDataReadiness.entitiesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.entitiesLead")}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {record.entities.map((entity) => (
                <li key={entity.id} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  <span className="font-medium">{t(entity.name_key as TranslationKey)}</span>
                  <span className="ml-2 text-[var(--twin-muted)]">
                    {entity.demo_only ? t("workingDataReadiness.demoOnly") : t("workingDataReadiness.partialLive")}
                  </span>
                  {entity.persistence_candidate && (
                    <span className="ml-2 text-[var(--twin-accent)]">{t("workingDataReadiness.persistencePlanned")}</span>
                  )}
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          WORKING_DATA_READINESS_MARKERS.demoSources,
          t("workingDataReadiness.demoSourcesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.demoSourcesLead")}</p>
            <ul className="space-y-2">
              {record.demo_sources.map((source) => (
                <li key={source.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <Link href={source.route} className="twin-link font-medium">
                    {t(source.label_key as TranslationKey)}
                  </Link>
                  <span className="uppercase text-[var(--twin-muted)]">{source.status}</span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          WORKING_DATA_READINESS_MARKERS.persistenceCandidates,
          t("workingDataReadiness.persistenceTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.persistenceLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.persistence_candidates.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          WORKING_DATA_READINESS_MARKERS.unsafeDeferrals,
          t("workingDataReadiness.unsafeTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.unsafeLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.unsafe_deferrals.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          WORKING_DATA_READINESS_MARKERS.backendBoundaries,
          t("workingDataReadiness.boundariesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.boundariesLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.backend_boundaries.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          WORKING_DATA_READINESS_MARKERS.auditPreview,
          t("workingDataReadiness.auditTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("workingDataReadiness.auditLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.audit_preview_events.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        <Card variant="soft" className="p-5">
          <div data-testid={WORKING_DATA_READINESS_MARKERS.implementation}>
            <h2 className="text-sm font-semibold uppercase">{t("workingDataReadiness.implementationTitle")}</h2>
            <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("workingDataReadiness.implementationLead")}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm">
              {record.implementation_steps.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ol>
          </div>
        </Card>

        <BoardPersistenceStateSections
          shippedTitle={t("boardPersistenceState.shippedTitle")}
          blockedTitle={t("boardPersistenceState.blockedTitle")}
        />

        {section(
          WORKING_DATA_READINESS_MARKERS.launch,
          t("workingDataReadiness.launchTitle"),
          <>
            <p>{t("workingDataReadiness.launchNoGo")}</p>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("workingDataReadiness.p0Open")}</p>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("workingDataReadiness.phase3bBlocked")}</p>
          </>,
        )}
      </div>
    </Shell>
  );
}
