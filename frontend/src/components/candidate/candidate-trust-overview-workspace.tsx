"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { CandidateTrustRequestStatusLoader } from "@/components/candidate/candidate-trust-request-status-loader";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateTrustOverviewRecord } from "@/lib/candidate-trust-overview-demo-data";
import {
  CANDIDATE_TRUST_OVERVIEW_MARKERS,
  CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS,
  resolveCandidateTrustOverview,
} from "@/lib/candidate-trust-overview";
import { placementVerificationIntegrationHref } from "@/lib/placement-verification-integration";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode, className = ""): ReactNode {
  return (
    <Card
      variant="soft"
      className={`border-[var(--twin-border)]/80 p-5 sm:p-6 ${className}`}
      data-testid={marker}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function statusLabelKey(status: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    pilot: "candidateTrustOverview.statusPilot",
    live: "candidateTrustOverview.statusLive",
    not_live: "candidateTrustOverview.statusNotLive",
    preview: "candidateTrustOverview.actionPreview",
    planned: "candidateTrustOverview.actionPlanned",
    review_required: "candidateTrustOverview.actionReviewRequired",
  };
  return map[status] ?? "candidateTrustOverview.statusPilot";
}

function TrustOverviewNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_TRUST_OVERVIEW_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateTrustOverview.notFoundTitle")}
          message={t("candidateTrustOverview.notFoundMessage")}
          steps={[
            t("candidateTrustOverview.notFoundStep1"),
            t("candidateTrustOverview.notFoundStep2"),
            t("candidateTrustOverview.notFoundStep3"),
          ]}
          actionLabel={t("candidateTrustOverview.notFoundCta")}
          actionHref={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.trustCenter}
        />
      </div>
    </Shell>
  );
}

function TrustOverviewContent({ record }: { record: CandidateTrustOverviewRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div
        data-candidate-trust-overview-page={CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER}
        data-testid={CANDIDATE_TRUST_OVERVIEW_MARKERS.page}
        className="space-y-6"
      >
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.trustCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateTrustOverview.linkTrustCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateTrustOverview.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_TRUST_OVERVIEW_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateTrustOverview.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateTrustOverview.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <span
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
              data-testid={CANDIDATE_TRUST_OVERVIEW_MARKERS.pilotBadge}
            >
              {t("candidateTrustOverview.pilotBadge")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.controlCenter} className="twin-link font-medium">
              {t("candidateTrustOverview.linkControlCenter")}
            </Link>
            <Link href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.panel} className="twin-link font-medium">
              {t("candidateTrustOverview.linkDashboard")}
            </Link>
          </div>
        </header>

        <CandidateTrustRequestStatusLoader />

        <CompactAuditTrailWidget />

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.moduleMap,
          t("candidateTrustOverview.moduleMapTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateTrustOverview.moduleMapLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {record.trust_modules.map((mod) => (
                <li key={mod.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <Link href={mod.href} className="twin-link font-semibold">
                    {t(mod.label_key as TranslationKey)}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                    {t(mod.summary_key as TranslationKey)}
                  </p>
                  <span className="mt-2 inline-block rounded bg-[var(--twin-border)]/40 px-2 py-0.5 text-[10px] uppercase">
                    {t(statusLabelKey(mod.status))}
                  </span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.timeline,
          t("candidateTrustOverview.timelineTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateTrustOverview.timelineLead")}</p>
            <ol className="space-y-2">
              {record.timeline.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span className="shrink-0 font-mono text-xs text-[var(--twin-muted-strong)]">
                    {event.at.slice(0, 10)}
                  </span>
                  <span>{t(event.summary_key as TranslationKey)}</span>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.downloadableRecords,
          t("candidateTrustOverview.downloadableTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateTrustOverview.downloadableLead")}</p>
            <ul className="space-y-2">
              {record.downloadable_records.map((dl) => (
                <li key={dl.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--twin-border)]/50 px-3 py-2">
                  <span>{t(dl.label_key as TranslationKey)}</span>
                  <span className="text-xs text-[var(--twin-muted-strong)]">
                    {dl.format.toUpperCase()} · {t("candidateTrustOverview.noBackendWrite")}
                  </span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.pendingActions,
          t("candidateTrustOverview.pendingTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateTrustOverview.pendingLead")}</p>
            <ul className="space-y-2">
              {record.pending_actions.map((action) => (
                <li key={action.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{t(action.label_key as TranslationKey)}</span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                    {t(statusLabelKey(action.status))}
                  </span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.safetyBoundaries,
          t("candidateTrustOverview.boundaryTitle"),
          <>
            <ul className="list-disc space-y-1 pl-5">
              {record.safety_boundaries.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.recommendedNext,
          t("candidateTrustOverview.recommendedTitle"),
          <>
            <p>{t(record.recommended_next_action_key as TranslationKey)}</p>
            <Link href={record.recommended_next_href} className="twin-btn-solid twin-touch-target inline-block text-sm">
              {t("candidateTrustOverview.recommendedCta")}
            </Link>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_OVERVIEW_MARKERS.linkedModules,
          t("candidateTrustOverview.linkedModulesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidateTrustOverview.linkedModulesLead")}</p>
            <div className="flex flex-wrap gap-3">
              {record.trust_modules.map((mod) => (
                <Link key={mod.id} href={mod.href} className="twin-link text-sm font-medium">
                  {t(mod.label_key as TranslationKey)}
                </Link>
              ))}
              <Link href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.jobs} className="twin-link text-sm font-medium">
                {t("candidateTrustOverview.linkJobs")}
              </Link>
              <Link href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.matches} className="twin-link text-sm font-medium">
                {t("candidateTrustOverview.linkMatches")}
              </Link>
              <Link href={CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS.profile} className="twin-link text-sm font-medium">
                {t("candidateTrustOverview.linkProfile")}
              </Link>
              <Link
                href={placementVerificationIntegrationHref("candidate_preview")}
                className="twin-link text-sm font-medium"
              >
                {t("candidatePlacementVerification.pageTitle")}
              </Link>
            </div>
          </>,
        )}
      </div>
    </Shell>
  );
}

export function CandidateTrustOverviewWorkspace() {
  const record = resolveCandidateTrustOverview();
  if (!record) return <TrustOverviewNotFound />;
  return <TrustOverviewContent record={record} />;
}
