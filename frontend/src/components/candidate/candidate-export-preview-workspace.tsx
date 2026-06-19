"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { ExportPreviewPanel } from "@/components/candidate/export-preview-panel";
import { ExportRequestPersistenceNote } from "@/components/candidate/export-request-persistence-note";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateExportPreviewRecord } from "@/lib/candidate-export-preview-demo-data";
import {
  CANDIDATE_EXPORT_PREVIEW_MARKERS,
  CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER,
  CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS,
  resolveCandidateExportPreview,
} from "@/lib/candidate-export-preview";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateIdentityVerificationHref } from "@/lib/candidate-identity-verification";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
import { candidateTrustAuditExportHref } from "@/lib/candidate-trust-audit-export";
import { exportRequestsHref } from "@/lib/export-requests";

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

function ExportPreviewNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_EXPORT_PREVIEW_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateExportPreview.notFoundTitle")}
          message={t("candidateExportPreview.notFoundMessage")}
          steps={[
            t("candidateExportPreview.notFoundStep1"),
            t("candidateExportPreview.notFoundStep2"),
            t("candidateExportPreview.notFoundStep3"),
          ]}
          actionLabel={t("candidateExportPreview.notFoundCta")}
          actionHref={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function ExportPreviewContent({ record }: { record: CandidateExportPreviewRecord }) {
  const { t } = useTranslation();
  const jsonFull = useMemo(() => JSON.stringify(record.bundle, null, 2), [record.bundle]);

  return (
    <Shell wide rail>
      <div data-candidate-export-preview-page={CANDIDATE_EXPORT_PREVIEW_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateExportPreview.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateExportPreview.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_EXPORT_PREVIEW_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateExportPreview.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateExportPreview.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_EXPORT_PREVIEW_MARKERS.pilotBadge}
              >
                {t("candidateExportPreview.pilotBadge")}
              </span>
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.export_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateExportPreview.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-trust-link"
            >
              {t("candidateExportPreview.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-controls-link"
            >
              {t("candidateExportPreview.linkControlCenter")}
            </Link>
            <Link
              href={candidateIdentityVerificationHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-identity-verification-link"
            >
              {t("candidateIdentityVerification.pageTitle")}
            </Link>
            <Link
              href={candidateCorrectionRequestHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-correction-request-link"
            >
              {t("candidateCorrectionRequest.pageTitle")}
            </Link>
            <Link
              href={candidateDataPortabilityHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-data-portability-link"
            >
              {t("candidateDataPortability.pageTitle")}
            </Link>
            <Link
              href={candidateRevokeDeleteHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-revoke-delete-link"
            >
              {t("candidateRevokeDelete.pageTitle")}
            </Link>
            <Link
              href={candidateTrustAuditExportHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-audit-export-link"
            >
              {t("candidateTrustAuditExport.pageTitle")}
            </Link>
            <Link
              href={candidateConsentReceiptHref()}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-consent-receipt-link"
            >
              {t("candidateConsentReceipt.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-export-preview-profile-link"
            >
              {t("candidateExportPreview.linkProfile")}
            </Link>
            <Link href={exportRequestsHref()} className="twin-link font-medium" data-testid="candidate-export-preview-export-requests-link">
              {t("exportRequests.linkExportRequests")}
            </Link>
            <Link href={CANDIDATE_EXPORT_PREVIEW_SAFE_LINKS.gdprConsent} className="twin-link font-medium">
              {t("candidateExportPreview.linkGdprConsent")}
            </Link>
          </div>
        </header>

        <ExportRequestPersistenceNote testId="candidate-export-preview-export-request-note" />

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.bundlePreview,
          t("candidateExportPreview.bundlePreviewTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateExportPreview.bundlePreviewLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateExportPreview.metaCandidateId")}</dt>
                <dd>{record.bundle.export_metadata.candidate_id}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateExportPreview.metaBundleVersion")}</dt>
                <dd>{record.bundle.export_metadata.bundle_version}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateExportPreview.metaDemoOnly")}</dt>
                <dd>{String(record.bundle.export_metadata.demo_only)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateExportPreview.metaBackendWrite")}</dt>
                <dd>{String(record.bundle.export_metadata.backend_write)}</dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.jsonPanel,
          t("candidateExportPreview.jsonPanelTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateExportPreview.jsonPanelLead")}</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)] p-3 text-[10px] leading-relaxed">
              {jsonFull}
            </pre>
          </>,
        )}

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.download,
          t("candidateExportPreview.downloadSectionTitle"),
          <ExportPreviewPanel record={record} showFullPageLink={false} />,
        )}

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.auditTimeline,
          t("candidateExportPreview.auditTimelineTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateExportPreview.auditTimelineLead")}</p>
            <ol className="space-y-3 border-l-2 border-[var(--twin-border)] pl-4">
              {record.bundle.audit_preview_events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
                    {event.type} · {event.at.slice(0, 10)}
                  </p>
                  <p className="mt-0.5">{event.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("candidateExportPreview.noBackendWrite")}</p>
                </li>
              ))}
            </ol>
          </>,
        )}

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.includedExcluded,
          t("candidateExportPreview.includedExcludedTitle"),
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                  {t("candidateExportPreview.includedColumn")}
                </p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {record.included_sections.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
                  {t("candidateExportPreview.excludedColumn")}
                </p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {record.excluded_sections.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
        )}

        {sectionCard(
          CANDIDATE_EXPORT_PREVIEW_MARKERS.boundary,
          t("candidateExportPreview.boundaryTitle"),
          <p>{t("candidateExportPreview.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateExportPreviewWorkspaceProps = {
  candidateId?: string;
};

export function CandidateExportPreviewWorkspace({ candidateId }: CandidateExportPreviewWorkspaceProps) {
  const record = resolveCandidateExportPreview(candidateId);
  if (!record) return <ExportPreviewNotFound />;
  return <ExportPreviewContent record={record} />;
}
