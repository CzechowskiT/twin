"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateTrustRequestStatusLoader } from "@/components/candidate/candidate-trust-request-status-loader";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { CorrectionCategoryLabel } from "@/components/candidate/correction-request-panel";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type {
  CandidateCorrectionRequestRecord,
  CorrectionCategoryType,
} from "@/lib/candidate-correction-request-demo-data";
import {
  CANDIDATE_CORRECTION_REQUEST_MARKERS,
  CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER,
  CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS,
  resolveCandidateCorrectionRequest,
} from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
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

function categoryTypeKey(type: CorrectionCategoryType): TranslationKey {
  const map: Record<CorrectionCategoryType, TranslationKey> = {
    profile_field: "candidateCorrectionRequest.categoryProfileField",
    skills_competency: "candidateCorrectionRequest.categorySkillsCompetency",
    experience_timeline: "candidateCorrectionRequest.categoryExperienceTimeline",
    education_credential: "candidateCorrectionRequest.categoryEducationCredential",
    visibility_scope: "candidateCorrectionRequest.categoryVisibilityScope",
    application_match_data: "candidateCorrectionRequest.categoryApplicationMatchData",
  };
  return map[type];
}

function workflowStatusKey(status: "planned" | "not_live" | "preview_only"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    planned: "candidateCorrectionRequest.workflowPlanned",
    not_live: "candidateCorrectionRequest.workflowNotLive",
    preview_only: "candidateCorrectionRequest.workflowPreviewOnly",
  };
  return map[status];
}

function reviewStatusKey(status: "pending_preview" | "ready_preview" | "blocked_preview"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    pending_preview: "candidateCorrectionRequest.reviewPending",
    ready_preview: "candidateCorrectionRequest.reviewReady",
    blocked_preview: "candidateCorrectionRequest.reviewBlocked",
  };
  return map[status];
}

function CorrectionRequestNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_CORRECTION_REQUEST_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateCorrectionRequest.notFoundTitle")}
          message={t("candidateCorrectionRequest.notFoundMessage")}
          steps={[
            t("candidateCorrectionRequest.notFoundStep1"),
            t("candidateCorrectionRequest.notFoundStep2"),
            t("candidateCorrectionRequest.notFoundStep3"),
          ]}
          actionLabel={t("candidateCorrectionRequest.notFoundCta")}
          actionHref={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function CorrectionRequestContent({ record }: { record: CandidateCorrectionRequestRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div data-candidate-correction-request-page={CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateCorrectionRequest.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateCorrectionRequest.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_CORRECTION_REQUEST_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateCorrectionRequest.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateCorrectionRequest.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_CORRECTION_REQUEST_MARKERS.pilotBadge}
              >
                {t("candidateCorrectionRequest.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.correction_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateCorrectionRequest.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-trust-link"
            >
              {t("candidateCorrectionRequest.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-controls-link"
            >
              {t("candidateCorrectionRequest.linkControlCenter")}
            </Link>
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.exportPreview}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-export-preview-link"
            >
              {t("candidateCorrectionRequest.linkExportPreview")}
            </Link>
            <Link
              href={candidateDataPortabilityHref()}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-data-portability-link"
            >
              {t("candidateCorrectionRequest.linkDataPortability")}
            </Link>
            <Link
              href={candidateRevokeDeleteHref()}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-revoke-delete-link"
            >
              {t("candidateRevokeDelete.pageTitle")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={candidateConsentReceiptHref()}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-consent-receipt-link"
            >
              {t("candidateConsentReceipt.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-profile-link"
            >
              {t("candidateCorrectionRequest.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-jobs-link"
            >
              {t("candidateCorrectionRequest.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-correction-request-matches-link"
            >
              {t("candidateCorrectionRequest.linkMatches")}
            </Link>
          </div>
        </header>

        <CandidateTrustRequestStatusLoader />

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.categories,
          t("candidateCorrectionRequest.categoriesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.categoriesLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {record.bundle.categories.map((cat) => (
                <li key={cat.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">
                    <CorrectionCategoryLabel type={cat.type} />
                  </p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{cat.description}</p>
                  <p className="mt-2 text-[10px] text-[var(--twin-muted)]">
                    {t(categoryTypeKey(cat.type))} · {cat.example_fields.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.draftRequest,
          t("candidateCorrectionRequest.draftTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.draftLead")}</p>
            <ul className="space-y-3">
              {record.bundle.draft_fields.map((field) => (
                <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{field.field_label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                    {t("candidateCorrectionRequest.currentValue")}: {field.current_value}
                  </p>
                  <p className="mt-1 text-xs">
                    {t("candidateCorrectionRequest.proposedValue")}: {field.proposed_value}
                  </p>
                  <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{field.rationale}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
              data-testid={CANDIDATE_CORRECTION_REQUEST_MARKERS.submitDisabled}
            >
              {t("candidateCorrectionRequest.submitDisabledCta")}
            </button>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.evidence,
          t("candidateCorrectionRequest.evidenceTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.evidenceLead")}</p>
            <ul className="space-y-3">
              {record.bundle.evidence_attachments.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.preview_note}</p>
                  <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">{item.kind}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.review,
          t("candidateCorrectionRequest.reviewTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.reviewLead")}</p>
            <ul className="space-y-3">
              {record.bundle.review_checkpoints.map((chk) => (
                <li key={chk.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">{chk.label}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{chk.note}</p>
                  </div>
                  <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t(reviewStatusKey(chk.status))}
                  </span>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.auditPreview,
          t("candidateCorrectionRequest.auditTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.auditLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.bundle.audit_preview_events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {event.type} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateCorrectionRequest.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.linkedModules,
          t("candidateCorrectionRequest.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.linkedModulesLead")}</p>
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
          CANDIDATE_CORRECTION_REQUEST_MARKERS.plannedWorkflow,
          t("candidateCorrectionRequest.plannedWorkflowTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateCorrectionRequest.plannedWorkflowLead")}</p>
            <ol className="space-y-3">
              {record.bundle.planned_workflow.map((step) => (
                <li key={step.id} className="flex gap-3 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--twin-border)] text-[10px] font-bold">
                    {step.order}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{step.description}</p>
                    <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">{t(workflowStatusKey(step.status))}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CORRECTION_REQUEST_MARKERS.boundary,
          t("candidateCorrectionRequest.boundaryTitle"),
          <p>{t("candidateCorrectionRequest.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateCorrectionRequestWorkspaceProps = {
  candidateId?: string;
};

export function CandidateCorrectionRequestWorkspace({ candidateId }: CandidateCorrectionRequestWorkspaceProps) {
  const record = resolveCandidateCorrectionRequest(candidateId);
  if (!record) return <CorrectionRequestNotFound />;
  return <CorrectionRequestContent record={record} />;
}
