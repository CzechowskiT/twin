"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { BoardPersistenceStateSections } from "@/components/board/board-persistence-state-sections";
import {
  LAUNCH_STANCE,
  WORKING_FEATURES_READINESS_LINKS,
  WORKING_FEATURES_READINESS_MARKERS,
  WORKING_FEATURES_READINESS_PAGE_MARKER,
  resolveWorkingFeaturesReadiness,
} from "@/lib/working-features-readiness";
import type { TranslationKey } from "@/lib/i18n";

function section(marker: string, title: string, body: string): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
        <p className="mt-3 text-sm">{body}</p>
      </div>
    </Card>
  );
}

export function WorkingFeaturesReadinessWorkspace() {
  const { t } = useTranslation();
  const record = resolveWorkingFeaturesReadiness();

  return (
    <Shell wide>
      <div
        data-working-features-readiness-page={WORKING_FEATURES_READINESS_PAGE_MARKER}
        data-testid={WORKING_FEATURES_READINESS_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={WORKING_FEATURES_READINESS_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("workingFeaturesReadiness.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t("workingFeaturesReadiness.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("workingFeaturesReadiness.headerLead")}</p>
          <span
            data-testid={WORKING_FEATURES_READINESS_MARKERS.pilotBadge}
            className="inline-block rounded-full border px-3 py-1 text-xs"
            data-launch-stance={LAUNCH_STANCE}
          >
            {t("workingFeaturesReadiness.pilotBadge")}
          </span>
          <div className="flex gap-3 text-xs">
            {WORKING_FEATURES_READINESS_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="twin-link">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {section(
          WORKING_FEATURES_READINESS_MARKERS.candidateMatrix,
          t("workingFeaturesReadiness.candidateMatrixTitle"),
          t("workingFeaturesReadiness.candidateMatrixLead"),
        )}
        {section(
          WORKING_FEATURES_READINESS_MARKERS.recruiterMatrix,
          t("workingFeaturesReadiness.recruiterMatrixTitle"),
          t("workingFeaturesReadiness.recruiterMatrixLead"),
        )}
        {section(
          WORKING_FEATURES_READINESS_MARKERS.companyMatrix,
          t("workingFeaturesReadiness.companyMatrixTitle"),
          t("workingFeaturesReadiness.companyMatrixLead"),
        )}
        {section(
          WORKING_FEATURES_READINESS_MARKERS.investorMatrix,
          t("workingFeaturesReadiness.investorMatrixTitle"),
          t("workingFeaturesReadiness.investorMatrixLead"),
        )}
        {section(
          WORKING_FEATURES_READINESS_MARKERS.backend,
          t("workingFeaturesReadiness.backendTitle"),
          t("workingFeaturesReadiness.backendLead"),
        )}
        {section(
          WORKING_FEATURES_READINESS_MARKERS.riskOrder,
          t("workingFeaturesReadiness.riskOrderTitle"),
          t("workingFeaturesReadiness.riskOrderLead"),
        )}

        <Card variant="soft" className="p-5">
          <div data-testid={WORKING_FEATURES_READINESS_MARKERS.implementation}>
            <h2 className="text-sm font-semibold uppercase">{t("workingFeaturesReadiness.implementationTitle")}</h2>
            <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("workingFeaturesReadiness.implementationLead")}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm">
              {record.steps.map((key) => (
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
          WORKING_FEATURES_READINESS_MARKERS.launch,
          t("workingFeaturesReadiness.launchTitle"),
          t("workingFeaturesReadiness.launchNoGo"),
        )}
      </div>
    </Shell>
  );
}
