"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  CANDIDATE_PLACEMENT_VERIFICATION_MARKERS,
  CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER,
  CANDIDATE_PLACEMENT_VERIFICATION_SAFE_LINKS,
  candidatePlacementMissingExternal,
  placementVerificationSourceKey,
  resolveCandidatePlacementVerification,
} from "@/lib/candidate-placement-verification-preview";
import type { PlacementVerificationRecord } from "@/lib/placement-verification";
import type { TranslationKey } from "@/lib/i18n";

const PlacementEventsTimeline = dynamic(
  () => import("@/components/shared/placement-events-timeline").then((m) => m.PlacementEventsTimeline),
  { ssr: false },
);

function sectionCard(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={marker}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function statusLabelKey(status: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    pipeline: "candidatePlacementVerification.statusPipeline",
    offer_reported: "candidatePlacementVerification.statusOfferReported",
    verification_pending: "candidatePlacementVerification.statusVerificationPending",
    placement_verified: "candidatePlacementVerification.statusPlacementVerified",
    verification_failed: "candidatePlacementVerification.statusVerificationFailed",
    disputed: "candidatePlacementVerification.statusDisputed",
  };
  return map[status] ?? "candidatePlacementVerification.statusVerificationPending";
}

function stageLabelKey(stage: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    not_started: "candidatePlacementVerification.stageNotStarted",
    self_declaration: "candidatePlacementVerification.stageSelfDeclaration",
    evidence_collection: "candidatePlacementVerification.stageEvidenceCollection",
    external_confirmation_pending: "candidatePlacementVerification.stageExternalPending",
    human_review: "candidatePlacementVerification.stageHumanReview",
    verification_ready: "candidatePlacementVerification.stageVerificationReady",
    closed: "candidatePlacementVerification.stageClosed",
  };
  return map[stage] ?? "candidatePlacementVerification.stageExternalPending";
}

function PreviewNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidatePlacementVerification.notFoundTitle")}
          message={t("candidatePlacementVerification.notFoundMessage")}
          steps={[
            t("candidatePlacementVerification.notFoundStep1"),
            t("candidatePlacementVerification.notFoundStep2"),
            t("candidatePlacementVerification.notFoundStep3"),
          ]}
          actionLabel={t("candidatePlacementVerification.notFoundCta")}
          actionHref={CANDIDATE_PLACEMENT_VERIFICATION_SAFE_LINKS.trustCenter}
        />
      </div>
    </Shell>
  );
}

function PreviewContent({ record }: { record: PlacementVerificationRecord }) {
  const { t } = useTranslation();
  const missingExternal = candidatePlacementMissingExternal(record);

  return (
    <Shell wide rail>
      <div
        data-candidate-placement-verification-page={CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER}
        data-testid={CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.page}
        className="space-y-6"
      >
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_PLACEMENT_VERIFICATION_SAFE_LINKS.trustCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidatePlacementVerification.linkTrustCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidatePlacementVerification.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidatePlacementVerification.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidatePlacementVerification.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-xs text-[var(--twin-muted)]">
                {record.role_title} · {record.company_label}
              </p>
            </div>
            <span
              className="inline-block rounded-full border px-3 py-1 text-xs"
              data-testid={CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.sourceBadge}
            >
              {t(placementVerificationSourceKey(record.source))}
            </span>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.status,
          t("candidatePlacementVerification.statusTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidatePlacementVerification.statusLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidatePlacementVerification.placementStatusLabel")}</dt>
                <dd className="font-medium">{t(statusLabelKey(record.placement_status))}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidatePlacementVerification.verificationStageLabel")}</dt>
                <dd className="font-medium">{t(stageLabelKey(record.verification_stage))}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidatePlacementVerification.placementIdLabel")}</dt>
                <dd className="font-mono">{record.placement_id}</dd>
              </div>
              <div>
                <dt className="text-[var(--twin-muted)]">{t("candidatePlacementVerification.applicationIdLabel")}</dt>
                <dd className="font-mono">{record.application_id}</dd>
              </div>
            </dl>
          </>,
        )}

        {missingExternal
          ? sectionCard(
              CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.externalGap,
              t("candidatePlacementVerification.externalGapTitle"),
              <>
                <p className="text-[var(--twin-accent)]">{t("candidatePlacementVerification.externalGapLead")}</p>
                <p className="text-xs text-[var(--twin-muted)]">{t("candidatePlacementVerification.externalGapNote")}</p>
              </>,
            )
          : null}

        {sectionCard(
          CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.evidence,
          t("candidatePlacementVerification.evidenceTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidatePlacementVerification.evidenceLead")}</p>
            <ul className="space-y-2">
              {record.evidence_items.map((item) => (
                <li key={item.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-2 text-[var(--twin-muted)]">
                    · {item.status} · {item.confidence}
                  </span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.riskFlags,
          t("candidatePlacementVerification.riskTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidatePlacementVerification.riskLead")}</p>
            <ul className="space-y-2">
              {record.risk_flags.map((flag) => (
                <li key={flag.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                  <span className="font-medium uppercase text-[var(--twin-accent)]">{flag.severity}</span>
                  <p className="mt-1 font-medium">{flag.label}</p>
                  <p className="text-[var(--twin-muted)]">{flag.detail}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_PLACEMENT_VERIFICATION_MARKERS.demoActions,
          t("candidatePlacementVerification.demoActionsTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("candidatePlacementVerification.demoActionsLead")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
                {t("candidatePlacementVerification.actionConfirmWorkEmail")}
              </button>
              <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
                {t("candidatePlacementVerification.actionUploadDocument")}
              </button>
              <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
                {t("candidatePlacementVerification.actionRequestReview")}
              </button>
            </div>
            <p className="text-xs text-[var(--twin-muted)]">{t("candidatePlacementVerification.demoActionsNote")}</p>
          </>,
        )}

        <PlacementEventsTimeline placementId={record.placement_id} />
      </div>
    </Shell>
  );
}

export function CandidatePlacementVerificationPreviewWorkspace() {
  const record = resolveCandidatePlacementVerification();
  if (!record) return <PreviewNotFound />;
  return <PreviewContent record={record} />;
}
