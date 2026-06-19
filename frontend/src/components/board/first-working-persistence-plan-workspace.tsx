"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { BoardPersistenceStateSections } from "@/components/board/board-persistence-state-sections";
import {
  FIRST_WORKING_PERSISTENCE_PLAN_LINKS,
  FIRST_WORKING_PERSISTENCE_PLAN_MARKERS,
  FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER,
  LAUNCH_STANCE,
  resolveFirstWorkingPersistencePlan,
  type BackendSequenceStep,
} from "@/lib/first-working-persistence-plan";
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

function sequenceTable(steps: BackendSequenceStep[], t: (k: TranslationKey) => string): ReactNode {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.step} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-bold text-[var(--twin-accent)]">{step.step}.</span>
            <span className="font-medium">{t(step.title_key as TranslationKey)}</span>
            <span className="text-[var(--twin-muted)]">· {step.owner}</span>
          </div>
          <p className="mt-1 text-[var(--twin-muted-strong)]">{t(step.detail_key as TranslationKey)}</p>
          <p className="mt-1 text-[10px] uppercase text-[var(--twin-muted)]">
            {t("firstWorkingPersistencePlan.gateLabel")}: {t(step.gate_key as TranslationKey)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function FirstWorkingPersistencePlanWorkspace() {
  const { t } = useTranslation();
  const record = resolveFirstWorkingPersistencePlan();

  return (
    <Shell wide>
      <div
        data-first-working-persistence-plan-page={FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER}
        data-testid={FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("firstWorkingPersistencePlan.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("firstWorkingPersistencePlan.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.headerLead")}</p>
          <span
            data-testid={FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("firstWorkingPersistencePlan.pilotBadge")}
          </span>
          <div className="flex flex-wrap gap-3 text-xs">
            {FIRST_WORKING_PERSISTENCE_PLAN_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.backendSequence,
          t("firstWorkingPersistencePlan.backendSequenceTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.backendSequenceLead")}</p>
            {sequenceTable(record.backend_sequence, t)}
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.entityTargets,
          t("firstWorkingPersistencePlan.entityTargetsTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.entityTargetsLead")}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {record.entity_targets.map((key) => (
                <li key={key} className="rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                  {t(key as TranslationKey)}
                </li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.scopeBoundaries,
          t("firstWorkingPersistencePlan.scopeBoundariesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.scopeBoundariesLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.scope_boundaries.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.deferredActions,
          t("firstWorkingPersistencePlan.deferredActionsTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.deferredActionsLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.deferred_actions.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.migrationGates,
          t("firstWorkingPersistencePlan.migrationGatesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.migrationGatesLead")}</p>
            <ul className="list-decimal space-y-1 pl-4 text-xs">
              {record.migration_gates.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.dependencyOrder,
          t("firstWorkingPersistencePlan.dependencyOrderTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.dependencyOrderLead")}</p>
            <ul className="list-decimal space-y-1 pl-4 text-xs">
              {record.dependency_order.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.verificationChecklist,
          t("firstWorkingPersistencePlan.verificationTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.verificationLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.verification_checklist.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.noBackendWrites,
          t("firstWorkingPersistencePlan.noBackendTitle"),
          <>
            <p className="font-medium text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.noBackendLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.no_backend_routes.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {section(
          FIRST_WORKING_PERSISTENCE_PLAN_MARKERS.launchStatus,
          t("firstWorkingPersistencePlan.launchTitle"),
          <>
            <p>{t("firstWorkingPersistencePlan.launchNoGo")}</p>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.p0Open")}</p>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("firstWorkingPersistencePlan.phase3bBlocked")}</p>
          </>,
        )}

        <BoardPersistenceStateSections
          shippedTitle={t("boardPersistenceState.shippedTitle")}
          blockedTitle={t("boardPersistenceState.blockedTitle")}
        />
      </div>
    </Shell>
  );
}
