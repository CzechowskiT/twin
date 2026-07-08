"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateRevokeDeleteRecord } from "@/lib/candidate-revoke-delete-demo-data";
import {
  CANDIDATE_REVOKE_DELETE_MARKERS,
  CANDIDATE_REVOKE_DELETE_PAGE_MARKER,
  CANDIDATE_REVOKE_DELETE_SAFE_LINKS,
  resolveCandidateRevokeDelete,
} from "@/lib/candidate-revoke-delete";
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

function impactSeverityKey(severity: "informational" | "moderate_preview" | "high_preview"): TranslationKey {
  const map: Record<typeof severity, TranslationKey> = {
    informational: "candidateRevokeDelete.impactInformational",
    moderate_preview: "candidateRevokeDelete.impactModerate",
    high_preview: "candidateRevokeDelete.impactHigh",
  };
  return map[severity];
}

function workflowStatusKey(status: "planned" | "not_live" | "preview_only"): TranslationKey {
  const map: Record<typeof status, TranslationKey> = {
    planned: "candidateRevokeDelete.workflowPlanned",
    not_live: "candidateRevokeDelete.workflowNotLive",
    preview_only: "candidateRevokeDelete.workflowPreviewOnly",
  };
  return map[status];
}

function RevokeDeleteNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_REVOKE_DELETE_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateRevokeDelete.notFoundTitle")}
          message={t("candidateRevokeDelete.notFoundMessage")}
          steps={[
            t("candidateRevokeDelete.notFoundStep1"),
            t("candidateRevokeDelete.notFoundStep2"),
            t("candidateRevokeDelete.notFoundStep3"),
          ]}
          actionLabel={t("candidateRevokeDelete.notFoundCta")}
          actionHref={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function RevokeDeleteContent({ record }: { record: CandidateRevokeDeleteRecord }) {
  const { t } = useTranslation();
  const included = record.bundle.scope_items.filter((i) => i.scope === "included_preview");
  const excluded = record.bundle.scope_items.filter((i) => i.scope === "excluded_preview");

  return (
    <Shell wide rail>
      <div data-candidate-revoke-delete-page={CANDIDATE_REVOKE_DELETE_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateRevokeDelete.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateRevokeDelete.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_REVOKE_DELETE_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateRevokeDelete.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateRevokeDelete.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DemoJourneyPilotStatus testId={CANDIDATE_REVOKE_DELETE_MARKERS.pilotBadge} />
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.revoke_delete_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateRevokeDelete.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-trust-link"
            >
              {t("candidateRevokeDelete.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-controls-link"
            >
              {t("candidateRevokeDelete.linkControlCenter")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.exportPreview}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-export-preview-link"
            >
              {t("candidateRevokeDelete.linkExportPreview")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.corrections}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-corrections-link"
            >
              {t("candidateRevokeDelete.linkCorrections")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.dataPortability}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-data-portability-link"
            >
              {t("candidateRevokeDelete.linkDataPortability")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={candidateConsentReceiptHref()}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-consent-receipt-link"
            >
              {t("candidateConsentReceipt.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-profile-link"
            >
              {t("candidateRevokeDelete.linkProfile")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-jobs-link"
            >
              {t("candidateRevokeDelete.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-revoke-delete-matches-link"
            >
              {t("candidateRevokeDelete.linkMatches")}
            </Link>
          </div>
        </header>

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.requestTypeSelector,
          t("candidateRevokeDelete.requestTypeTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.requestTypeLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {record.bundle.request_type_options.map((opt) => (
                <li key={opt.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed text-left opacity-60"
                    data-testid={`candidate-revoke-delete-type-${opt.id}`}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{opt.description}</p>
                  </button>
                  {opt.selected_preview ? (
                    <p className="mt-2 text-[10px] uppercase text-[var(--twin-accent)]">
                      {t("candidateRevokeDelete.selectedPreview")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.impactPreview,
          t("candidateRevokeDelete.impactTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.impactLead")}</p>
            <ul className="space-y-3">
              {record.bundle.impact_preview.map((area) => (
                <li key={area.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="font-medium">{area.label}</p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{area.description}</p>
                  <p className="mt-2 text-[10px] uppercase text-[var(--twin-muted)]">
                    {t(impactSeverityKey(area.severity))}
                  </p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.includedExcludedScope,
          t("candidateRevokeDelete.scopeTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.scopeLead")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                  {t("candidateRevokeDelete.includedColumn")}
                </p>
                <ul className="mt-2 space-y-2">
                  {included.map((item) => (
                    <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
                  {t("candidateRevokeDelete.excludedColumn")}
                </p>
                <ul className="mt-2 space-y-2">
                  {excluded.map((item) => (
                    <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.draftRequest,
          t("candidateRevokeDelete.draftTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.draftLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.requestTypeLabel")}</dt>
                <dd>{record.bundle.draft_request.request_type}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.metaBackendWrite")}</dt>
                <dd>{String(record.bundle.draft_request.backend_write)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.confirmationNote")}</dt>
                <dd>{record.bundle.draft_request.confirmation_note}</dd>
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
              data-testid={CANDIDATE_REVOKE_DELETE_MARKERS.submitDisabled}
            >
              {t("candidateRevokeDelete.submitDisabledCta")}
            </button>
          </>,
        )}

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.auditTimeline,
          t("candidateRevokeDelete.auditTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.auditLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.bundle.audit_preview_events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {event.type} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateRevokeDelete.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_REVOKE_DELETE_MARKERS.linkedModules,
          t("candidateRevokeDelete.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.linkedModulesLead")}</p>
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
          CANDIDATE_REVOKE_DELETE_MARKERS.plannedWorkflow,
          t("candidateRevokeDelete.plannedWorkflowTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.plannedWorkflowLead")}</p>
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
          CANDIDATE_REVOKE_DELETE_MARKERS.boundary,
          t("candidateRevokeDelete.boundaryTitle"),
          <p>{t("candidateRevokeDelete.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateRevokeDeleteWorkspaceProps = {
  candidateId?: string;
};

export function CandidateRevokeDeleteWorkspace({ candidateId }: CandidateRevokeDeleteWorkspaceProps) {
  const record = resolveCandidateRevokeDelete(candidateId);
  if (!record) return <RevokeDeleteNotFound />;
  return <RevokeDeleteContent record={record} />;
}
