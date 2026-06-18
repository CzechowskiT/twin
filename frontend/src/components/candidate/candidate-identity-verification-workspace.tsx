"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type {
  CandidateIdentityVerificationRecord,
  IdentityFlowStep,
  IdentityVerificationStatus,
} from "@/lib/candidate-identity-verification-demo-data";
import {
  CANDIDATE_IDENTITY_VERIFICATION_MARKERS,
  CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER,
  CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS,
  resolveCandidateIdentityVerification,
} from "@/lib/candidate-identity-verification";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
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

function statusKey(status: IdentityVerificationStatus): TranslationKey {
  const map: Record<IdentityVerificationStatus, TranslationKey> = {
    pilot_unavailable: "candidateIdentityVerification.statusPilotUnavailable",
    not_started: "candidateIdentityVerification.statusNotStarted",
    in_review: "candidateIdentityVerification.statusInReview",
    provider_pending: "candidateIdentityVerification.statusProviderPending",
  };
  return map[status];
}

function flowStepKey(status: IdentityFlowStep["status"]): TranslationKey {
  const map: Record<IdentityFlowStep["status"], TranslationKey> = {
    planned: "candidateIdentityVerification.workflowPlanned",
    not_live: "candidateIdentityVerification.workflowNotLive",
    preview_only: "candidateIdentityVerification.workflowPreviewOnly",
    disabled: "candidateIdentityVerification.workflowDisabled",
  };
  return map[status];
}

function IdentityVerificationNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_IDENTITY_VERIFICATION_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateIdentityVerification.notFoundTitle")}
          message={t("candidateIdentityVerification.notFoundMessage")}
          steps={[
            t("candidateIdentityVerification.notFoundStep1"),
            t("candidateIdentityVerification.notFoundStep2"),
            t("candidateIdentityVerification.notFoundStep3"),
          ]}
          actionLabel={t("candidateIdentityVerification.notFoundCta")}
          actionHref={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function IdentityVerificationContent({ record }: { record: CandidateIdentityVerificationRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div
        data-candidate-identity-verification-page={CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER}
        className="space-y-6"
      >
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateIdentityVerification.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateIdentityVerification.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_IDENTITY_VERIFICATION_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateIdentityVerification.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateIdentityVerification.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_IDENTITY_VERIFICATION_MARKERS.pilotBadge}
              >
                {t("candidateIdentityVerification.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.verification_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateIdentityVerification.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-trust-link"
            >
              {t("candidateIdentityVerification.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-controls-link"
            >
              {t("candidateIdentityVerification.linkControlCenter")}
            </Link>
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.exportPreview}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-export-preview-link"
            >
              {t("candidateIdentityVerification.linkExportPreview")}
            </Link>
            <Link
              href={candidateCorrectionRequestHref()}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-corrections-link"
            >
              {t("candidateCorrectionRequest.pageTitle")}
            </Link>
            <Link
              href={candidateDataPortabilityHref()}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-data-portability-link"
            >
              {t("candidateDataPortability.pageTitle")}
            </Link>
            <Link
              href={candidateRevokeDeleteHref()}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-revoke-delete-link"
            >
              {t("candidateRevokeDelete.pageTitle")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-profile-link"
            >
              {t("candidateIdentityVerification.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-jobs-link"
            >
              {t("candidateIdentityVerification.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-identity-verification-matches-link"
            >
              {t("candidateIdentityVerification.linkMatches")}
            </Link>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.currentStatus,
          t("candidateIdentityVerification.currentStatusTitle"),
          <>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/15 p-4 text-sm leading-relaxed text-[var(--foreground)]">
              <p className="font-semibold">{t("dashboard.identityPilotNotice")}</p>
              <p className="mt-2">{t("dashboard.identityNotConfigured")}</p>
            </div>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.currentStatusLead")}</p>
            <div className="rounded-lg border border-[var(--twin-border)]/60 p-3">
              <p className="font-medium">{t(statusKey(record.bundle.current_status.status))}</p>
              <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{record.bundle.current_status.status_note}</p>
              <p className="mt-2 text-[10px] text-[var(--twin-muted)]">
                {t("candidateIdentityVerification.providerLabel")}: {record.bundle.current_status.provider_label}
              </p>
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.futureFlowPreview,
          t("candidateIdentityVerification.futureFlowTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.futureFlowLead")}</p>
            <ol className="space-y-3">
              {record.bundle.future_flow_steps.map((step) => (
                <li key={step.id} className="flex gap-3 rounded-lg border border-[var(--twin-border)]/60 p-3 opacity-80">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--twin-border)] text-[10px] font-bold">
                    {step.order}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{step.description}</p>
                    <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">{t(flowStepKey(step.status))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.dataSharedPreview,
          t("candidateIdentityVerification.dataSharedTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.dataSharedLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {record.bundle.data_shared_preview.map((field) => (
                <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{field.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{field.description}</p>
                  <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">{field.category}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.disabledActions,
          t("candidateIdentityVerification.disabledActionsTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.disabledActionsLead")}</p>
            <ul className="space-y-3">
              {record.bundle.disabled_actions.map((action) => (
                <li key={action.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{action.reason}</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50 text-xs"
                    data-testid={`candidate-identity-verification-action-${action.id}`}
                  >
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
              data-testid={CANDIDATE_IDENTITY_VERIFICATION_MARKERS.startDisabled}
            >
              {t("candidateIdentityVerification.startDisabledCta")}
            </button>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.auditTimeline,
          t("candidateIdentityVerification.auditTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.auditLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.bundle.audit_timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {event.type} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateIdentityVerification.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.linkedModules,
          t("candidateIdentityVerification.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateIdentityVerification.linkedModulesLead")}</p>
            <ul className="space-y-2">
              {record.bundle.linked_modules.map((mod) => (
                <li key={mod.id}>
                  <Link href={mod.href} className="twin-link text-xs font-medium">
                    {mod.label}
                  </Link>
                  <span className="ml-2 text-[10px] text-[var(--twin-muted)]">{mod.module_family}</span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_IDENTITY_VERIFICATION_MARKERS.boundary,
          t("candidateIdentityVerification.boundaryTitle"),
          <p>{t("candidateIdentityVerification.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateIdentityVerificationWorkspaceProps = {
  candidateId?: string;
};

export function CandidateIdentityVerificationWorkspace({
  candidateId,
}: CandidateIdentityVerificationWorkspaceProps) {
  const record = resolveCandidateIdentityVerification(candidateId);
  if (!record) return <IdentityVerificationNotFound />;
  return <IdentityVerificationContent record={record} />;
}
