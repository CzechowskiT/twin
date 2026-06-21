"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CandidateTrustRequestStatusLoader } from "@/components/candidate/candidate-trust-request-status-loader";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { ConsentReceiptPanel } from "@/components/candidate/consent-receipt-panel";
import { ExportRequestPersistenceNote } from "@/components/candidate/export-request-persistence-note";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { EXPORT_REQUEST_TYPES } from "@/lib/export-requests";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateConsentReceiptRecord } from "@/lib/candidate-consent-receipt-demo-data";
import {
  CANDIDATE_CONSENT_RECEIPT_MARKERS,
  CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER,
  CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS,
  resolveCandidateConsentReceipt,
} from "@/lib/candidate-consent-receipt";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateIdentityVerificationHref } from "@/lib/candidate-identity-verification";
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

function workflowLabelKey(workflow: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    trust_center: "candidateConsentReceipt.workflowTrustCenter",
    control_center: "candidateConsentReceipt.workflowControlCenter",
    export_preview: "candidateConsentReceipt.workflowExportPreview",
    identity_verification: "candidateConsentReceipt.workflowIdentityVerification",
    correction_request: "candidateConsentReceipt.workflowCorrectionRequest",
    portability_request: "candidateConsentReceipt.workflowPortability",
    revoke_delete: "candidateConsentReceipt.workflowRevokeDelete",
    trust_audit_export: "candidateConsentReceipt.workflowTrustAuditExport",
  };
  return map[workflow] ?? "candidateConsentReceipt.workflowTrustCenter";
}

function ConsentReceiptNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_CONSENT_RECEIPT_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateConsentReceipt.notFoundTitle")}
          message={t("candidateConsentReceipt.notFoundMessage")}
          steps={[
            t("candidateConsentReceipt.notFoundStep1"),
            t("candidateConsentReceipt.notFoundStep2"),
            t("candidateConsentReceipt.notFoundStep3"),
          ]}
          actionLabel={t("candidateConsentReceipt.notFoundCta")}
          actionHref={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function ConsentReceiptContent({ record }: { record: CandidateConsentReceiptRecord }) {
  const { t } = useTranslation();
  const jsonFull = useMemo(() => JSON.stringify(record.bundle, null, 2), [record.bundle]);

  const workflowCoverage = useMemo(() => {
    const byWorkflow = new Map<string, typeof record.bundle.audit_events>();
    for (const event of record.bundle.audit_events) {
      const list = byWorkflow.get(event.workflow) ?? [];
      list.push(event);
      byWorkflow.set(event.workflow, list);
    }
    return [
      "trust_center",
      "control_center",
      "export_preview",
      "identity_verification",
      "correction_request",
      "portability_request",
      "revoke_delete",
      "trust_audit_export",
    ].map((workflow) => ({
      workflow,
      events: byWorkflow.get(workflow) ?? [],
    }));
  }, [record.bundle.audit_events]);

  return (
    <Shell wide rail>
      <div data-candidate-consent-receipt-page={CANDIDATE_CONSENT_RECEIPT_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateConsentReceipt.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateConsentReceipt.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_CONSENT_RECEIPT_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateConsentReceipt.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateConsentReceipt.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_CONSENT_RECEIPT_MARKERS.pilotBadge}
              >
                {t("candidateConsentReceipt.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.receipt_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateConsentReceipt.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-trust-link"
            >
              {t("candidateConsentReceipt.linkTrustCenter")}
            </Link>
            <Link
              href={candidateExportPreviewHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-export-preview-link"
            >
              {t("candidateExportPreview.pageTitle")}
            </Link>
            <Link
              href={candidateIdentityVerificationHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-identity-verification-link"
            >
              {t("candidateIdentityVerification.pageTitle")}
            </Link>
            <Link
              href={candidateCorrectionRequestHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-correction-request-link"
            >
              {t("candidateCorrectionRequest.pageTitle")}
            </Link>
            <Link
              href={candidateDataPortabilityHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-data-portability-link"
            >
              {t("candidateDataPortability.pageTitle")}
            </Link>
            <Link
              href={candidateRevokeDeleteHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-revoke-delete-link"
            >
              {t("candidateRevokeDelete.pageTitle")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.panel}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-dashboard-link"
            >
              {t("candidateConsentReceipt.linkDashboard")}
            </Link>
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-jobs-link"
            >
              {t("candidateConsentReceipt.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-matches-link"
            >
              {t("candidateConsentReceipt.linkMatches")}
            </Link>
            <Link
              href={CANDIDATE_CONSENT_RECEIPT_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-consent-receipt-profile-link"
            >
              {t("candidateConsentReceipt.linkProfile")}
            </Link>
          </div>
        </header>

        <CandidateTrustRequestStatusLoader />

        <ExportRequestPersistenceNote
          testId="candidate-consent-receipt-export-request-note"
          requestType={EXPORT_REQUEST_TYPES.consentReceiptPreview}
        />

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.receiptSummary,
          t("candidateConsentReceipt.receiptSummaryTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.receiptSummaryLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaCandidateId")}</dt>
                <dd>{record.bundle.receipt_metadata.candidate_id}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaBundleVersion")}</dt>
                <dd>{record.bundle.receipt_metadata.bundle_version}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaDemoOnly")}</dt>
                <dd>{String(record.bundle.receipt_metadata.demo_only)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaBackendWrite")}</dt>
                <dd>{String(record.bundle.receipt_metadata.backend_write)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaGeneratedLocally")}</dt>
                <dd>{String(record.bundle.receipt_metadata.generated_locally)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.metaConsentReceiptPreview")}</dt>
                <dd>{String(record.bundle.receipt_metadata.consent_receipt_preview)}</dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.consentCoverage,
          t("candidateConsentReceipt.consentCoverageTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.consentCoverageLead")}</p>
            <div className="rounded-lg border border-[var(--twin-border)]/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent)]">
                {t("candidateConsentReceipt.consentSnapshotTitle")}
              </p>
              <ul className="mt-2 list-inside list-disc text-xs">
                {record.bundle.consent_snapshot.consent_items.map((item) => (
                  <li key={item.id}>
                    {item.purpose} — {item.status}
                  </li>
                ))}
              </ul>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {workflowCoverage.map(({ workflow, events }) => (
                <li key={workflow} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent)]">
                    {t(workflowLabelKey(workflow))}
                  </p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                    {events.length} {t("candidateConsentReceipt.eventCountLabel")}
                  </p>
                  <ol className="mt-2 space-y-2 border-l border-[var(--twin-border)] pl-3">
                    {events.slice(0, 2).map((event) => (
                      <li key={event.id} className="text-[10px]">
                        <span className="font-medium text-[var(--twin-muted-strong)]">
                          {event.type} · {event.at.slice(0, 10)}
                        </span>
                        <p className="mt-0.5">{event.summary}</p>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.jsonPanel,
          t("candidateConsentReceipt.jsonPanelTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.jsonPanelLead")}</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)] p-3 text-[10px] leading-relaxed">
              {jsonFull}
            </pre>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.download,
          t("candidateConsentReceipt.downloadSectionTitle"),
          <ConsentReceiptPanel record={record} showFullPageLink={false} />,
        )}

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.coveredExcludedScope,
          t("candidateConsentReceipt.coveredExcludedTitle"),
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                  {t("candidateConsentReceipt.coveredColumn")}
                </p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {record.bundle.covered_candidate_controls.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-rose-400/90">
                  {t("candidateConsentReceipt.excludedColumn")}
                </p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {record.bundle.excluded_scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_CONSENT_RECEIPT_MARKERS.linkedModules,
          t("candidateConsentReceipt.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.linkedModulesLead")}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {record.linked_modules.map((mod) => (
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
          CANDIDATE_CONSENT_RECEIPT_MARKERS.boundary,
          t("candidateConsentReceipt.boundaryTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateConsentReceipt.boundaryBody")}</p>
            <ul className="list-inside list-disc text-xs text-[var(--twin-muted-strong)]">
              {record.bundle.safety_boundaries.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>,
        )}
      </div>
    </Shell>
  );
}

export function CandidateConsentReceiptWorkspace() {
  const record = resolveCandidateConsentReceipt();
  if (!record) {
    return <ConsentReceiptNotFound />;
  }
  return <ConsentReceiptContent record={record} />;
}
