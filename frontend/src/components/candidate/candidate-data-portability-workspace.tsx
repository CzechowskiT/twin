"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateTrustRequestStatusLoader } from "@/components/candidate/candidate-trust-request-status-loader";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateDataPortabilityRecord } from "@/lib/candidate-data-portability-demo-data";
import {
  CANDIDATE_DATA_PORTABILITY_MARKERS,
  CANDIDATE_DATA_PORTABILITY_PAGE_MARKER,
  CANDIDATE_DATA_PORTABILITY_SAFE_LINKS,
  resolveCandidateDataPortability,
} from "@/lib/candidate-data-portability";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import type { TranslationKey } from "@/lib/i18n";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";

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

function scopeCoverageKey(
  coverage: "included_preview" | "excluded_preview" | "partial_preview",
): TranslationKey {
  const map: Record<typeof coverage, TranslationKey> = {
    included_preview: "candidateDataPortability.scopeIncluded",
    excluded_preview: "candidateDataPortability.scopeExcluded",
    partial_preview: "candidateDataPortability.scopePartial",
  };
  return map[coverage];
}

function workflowStatusKey(status: "planned" | "not_live" | "preview_only"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    planned: "candidateDataPortability.workflowPlanned",
    not_live: "candidateDataPortability.workflowNotLive",
    preview_only: "candidateDataPortability.workflowPreviewOnly",
  };
  return map[status];
}

function DataPortabilityNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_DATA_PORTABILITY_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateDataPortability.notFoundTitle")}
          message={t("candidateDataPortability.notFoundMessage")}
          steps={[
            t("candidateDataPortability.notFoundStep1"),
            t("candidateDataPortability.notFoundStep2"),
            t("candidateDataPortability.notFoundStep3"),
          ]}
          actionLabel={t("candidateDataPortability.notFoundCta")}
          actionHref={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function DataPortabilityContent({ record }: { record: CandidateDataPortabilityRecord }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div data-candidate-data-portability-page={CANDIDATE_DATA_PORTABILITY_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateDataPortability.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateDataPortability.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_DATA_PORTABILITY_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateDataPortability.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateDataPortability.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DemoJourneyPilotStatus testId={CANDIDATE_DATA_PORTABILITY_MARKERS.pilotBadge} />
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.portability_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateDataPortability.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-trust-link"
            >
              {t("candidateDataPortability.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-controls-link"
            >
              {t("candidateDataPortability.linkControlCenter")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.exportPreview}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-export-preview-link"
            >
              {t("candidateDataPortability.linkExportPreview")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.corrections}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-corrections-link"
            >
              {t("candidateDataPortability.linkCorrections")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.revokeDelete}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-revoke-delete-link"
            >
              {t("candidateDataPortability.linkRevokeDelete")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={candidateConsentReceiptHref()}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-consent-receipt-link"
            >
              {t("candidateConsentReceipt.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-profile-link"
            >
              {t("candidateDataPortability.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-jobs-link"
            >
              {t("candidateDataPortability.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_DATA_PORTABILITY_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-data-portability-matches-link"
            >
              {t("candidateDataPortability.linkMatches")}
            </Link>
          </div>
        </header>

        <CandidateTrustRequestStatusLoader />

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.portabilityScope,
          t("candidateDataPortability.scopeTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.scopeLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {record.bundle.portability_scope.map((area) => (
                <li key={area.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{area.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{area.description}</p>
                  <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">
                    {t(scopeCoverageKey(area.coverage))}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.includedChecklist,
          t("candidateDataPortability.includedTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.includedLead")}</p>
            <ul className="space-y-3">
              {record.bundle.included_checklist.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.excludedChecklist,
          t("candidateDataPortability.excludedTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.excludedLead")}</p>
            <ul className="space-y-3">
              {record.bundle.excluded_checklist.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.draftRequest,
          t("candidateDataPortability.draftTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.draftLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateDataPortability.requestTypeLabel")}</dt>
                <dd>{record.bundle.draft_request.request_type}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateDataPortability.metaBackendWrite")}</dt>
                <dd>{String(record.bundle.draft_request.backend_write)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateDataPortability.deliveryFormat")}</dt>
                <dd>{record.bundle.draft_request.delivery_format}</dd>
              </div>
            </dl>
            <ul className="space-y-3">
              {record.bundle.draft_request.fields.map((field) => (
                <li key={field.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{field.field_label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{field.preview_value}</p>
                  <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{field.note}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="twin-btn-secondary twin-touch-target cursor-not-allowed opacity-50"
              data-testid={CANDIDATE_DATA_PORTABILITY_MARKERS.submitDisabled}
            >
              {t("candidateDataPortability.submitDisabledCta")}
            </button>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.auditTimeline,
          t("candidateDataPortability.auditTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.auditLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.bundle.audit_preview_events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {event.type} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateDataPortability.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.linkedModules,
          t("candidateDataPortability.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.linkedModulesLead")}</p>
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
          CANDIDATE_DATA_PORTABILITY_MARKERS.plannedWorkflow,
          t("candidateDataPortability.plannedWorkflowTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateDataPortability.plannedWorkflowLead")}</p>
            <ol className="space-y-3">
              {record.bundle.planned_workflow.map((step) => (
                <li key={step.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <div>
                    <p className="font-medium">
                      {step.order}. {step.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{step.description}</p>
                  </div>
                  <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                    {t(workflowStatusKey(step.status))}
                  </span>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_DATA_PORTABILITY_MARKERS.boundary,
          t("candidateDataPortability.boundaryTitle"),
          <p>{t("candidateDataPortability.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateDataPortabilityWorkspaceProps = {
  candidateId?: string;
};

export function CandidateDataPortabilityWorkspace({ candidateId }: CandidateDataPortabilityWorkspaceProps) {
  const record = resolveCandidateDataPortability(candidateId);
  if (!record) return <DataPortabilityNotFound />;
  return <DataPortabilityContent record={record} />;
}
