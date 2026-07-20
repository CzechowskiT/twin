"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CandidateTrustRequestStatusLoader } from "@/components/candidate/candidate-trust-request-status-loader";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { TrustAuditExportPanel } from "@/components/candidate/trust-audit-export-panel";
import { ExportRequestPersistenceNote } from "@/components/candidate/export-request-persistence-note";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { EXPORT_REQUEST_TYPES } from "@/lib/export-requests";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import type { CandidateTrustAuditExportRecord } from "@/lib/candidate-trust-audit-export-demo-data";
import {
  CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS,
  CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER,
  CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS,
  resolveCandidateTrustAuditExport,
} from "@/lib/candidate-trust-audit-export";
import { candidateConsentReceiptHref } from "@/lib/candidate-consent-receipt";
import { candidateCorrectionRequestHref } from "@/lib/candidate-correction-request";
import { candidateDataPortabilityHref } from "@/lib/candidate-data-portability";
import { candidateExportPreviewHref } from "@/lib/candidate-export-preview";
import { candidateRevokeDeleteHref } from "@/lib/candidate-revoke-delete";
import { fetchTrustLiveBundle, isDemoFixtureCandidateId } from "@/lib/candidate-trust-live";
import { getToken } from "@/lib/auth";
import { saveBlobAsFile } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";
import { NonLiveMutationBanner } from "@/components/workspace/non-live-mutation-banner";
import { isDemoOrDevSurface } from "@/lib/production-action-gates";

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
    trust_center: "candidateTrustAuditExport.workflowTrustCenter",
    control_center: "candidateTrustAuditExport.workflowControlCenter",
    export_preview: "candidateTrustAuditExport.workflowExportPreview",
    correction_request: "candidateTrustAuditExport.workflowCorrectionRequest",
    portability_request: "candidateTrustAuditExport.workflowPortability",
    revoke_delete: "candidateTrustAuditExport.workflowRevokeDelete",
  };
  return map[workflow] ?? "candidateTrustAuditExport.workflowTrustCenter";
}

function TrustAuditExportNotFound() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.notFound} className="space-y-6">
        <GuidedEmptyState
          title={t("candidateTrustAuditExport.notFoundTitle")}
          message={t("candidateTrustAuditExport.notFoundMessage")}
          steps={[
            t("candidateTrustAuditExport.notFoundStep1"),
            t("candidateTrustAuditExport.notFoundStep2"),
            t("candidateTrustAuditExport.notFoundStep3"),
          ]}
          actionLabel={t("candidateTrustAuditExport.notFoundCta")}
          actionHref={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.controlCenter}
        />
      </div>
    </Shell>
  );
}

function TrustAuditExportContent({
  record,
  livePath,
}: {
  record: CandidateTrustAuditExportRecord;
  livePath: boolean;
}) {
  const { t } = useTranslation();
  const jsonFull = useMemo(() => JSON.stringify(record.bundle, null, 2), [record.bundle]);

  const workflowCoverage = [
    { workflow: "trust_center", events: record.bundle.trust_center_events },
    { workflow: "control_center", events: record.bundle.control_center_events },
    { workflow: "export_preview", events: record.bundle.export_preview_events },
    { workflow: "correction_request", events: record.bundle.correction_request_events },
    { workflow: "portability_request", events: record.bundle.portability_request_events },
    { workflow: "revoke_delete", events: record.bundle.revoke_delete_events },
  ];

  return (
    <Shell wide rail>
      <div data-candidate-trust-audit-export-page={CANDIDATE_TRUST_AUDIT_EXPORT_PAGE_MARKER} className="space-y-6">
        <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.controlCenter}
              className="twin-link twin-touch-target mb-4 inline-block text-sm"
            >
              ← {t("candidateTrustAuditExport.linkControlCenter")}
            </Link>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateTrustAuditExport.pageTitle")} />
        </div>

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateTrustAuditExport.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("candidateTrustAuditExport.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.display_name} · {record.role_title}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DemoJourneyPilotStatus testId={CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.pilotBadge} />
              <span className="text-xs text-[var(--twin-muted-strong)]">{record.export_label}</span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateTrustAuditExport.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          {livePath ? null : <NonLiveMutationBanner kind="sample_only" />}
          {livePath ? (
            <button
              type="button"
              className="twin-btn-secondary twin-touch-target"
              data-testid="candidate-audit-export-live-download"
              onClick={() => {
                const blob = new Blob([JSON.stringify(record.bundle, null, 2)], {
                  type: "application/json;charset=utf-8",
                });
                saveBlobAsFile(blob, "twin-trust-audit-live.json");
              }}
            >
              {t("candidateTrustLive.downloadMyData")}
            </button>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.trustCenter}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-trust-link"
            >
              {t("candidateTrustAuditExport.linkTrustCenter")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.controlCenter}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-controls-link"
            >
              {t("candidateTrustAuditExport.linkControlCenter")}
            </Link>
            <Link
              href={candidateExportPreviewHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-export-preview-link"
            >
              {t("candidateExportPreview.pageTitle")}
            </Link>
            <Link
              href={candidateCorrectionRequestHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-correction-request-link"
            >
              {t("candidateCorrectionRequest.pageTitle")}
            </Link>
            <Link
              href={candidateDataPortabilityHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-data-portability-link"
            >
              {t("candidateDataPortability.pageTitle")}
            </Link>
            <Link
              href={candidateRevokeDeleteHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-revoke-delete-link"
            >
              {t("candidateRevokeDelete.pageTitle")}
            </Link>
            <Link
              href={candidateConsentReceiptHref()}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-consent-receipt-link"
            >
              {t("candidateConsentReceipt.pageTitle")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.panel}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-dashboard-link"
            >
              {t("candidateTrustAuditExport.linkDashboard")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.jobs}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-jobs-link"
            >
              {t("candidateTrustAuditExport.linkJobs")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.matches}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-matches-link"
            >
              {t("candidateTrustAuditExport.linkMatches")}
            </Link>
            <Link
              href={CANDIDATE_TRUST_AUDIT_EXPORT_SAFE_LINKS.profile}
              className="twin-link font-medium"
              data-testid="candidate-trust-audit-export-profile-link"
            >
              {t("candidateTrustAuditExport.linkProfile")}
            </Link>
          </div>
        </header>

        <CandidateTrustRequestStatusLoader />

        <ExportRequestPersistenceNote
          testId="candidate-trust-audit-export-request-note"
          requestType={EXPORT_REQUEST_TYPES.trustAuditPreview}
        />

        {sectionCard(
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.exportSummary,
          t("candidateTrustAuditExport.exportSummaryTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.exportSummaryLead")}</p>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaCandidateId")}</dt>
                <dd>{record.bundle.export_metadata.candidate_id}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaBundleVersion")}</dt>
                <dd>{record.bundle.export_metadata.bundle_version}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaDemoOnly")}</dt>
                <dd>{String(record.bundle.export_metadata.demo_only)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaBackendWrite")}</dt>
                <dd>{String(record.bundle.export_metadata.backend_write)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaGeneratedLocally")}</dt>
                <dd>{String(record.bundle.export_metadata.generated_locally)}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.metaTrustAuditPreview")}</dt>
                <dd>{String(record.bundle.export_metadata.trust_audit_preview)}</dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.timelineCoverage,
          t("candidateTrustAuditExport.timelineCoverageTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.timelineCoverageLead")}</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {workflowCoverage.map(({ workflow, events }) => (
                <li key={workflow} className="rounded-lg border border-[var(--twin-border)]/60 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent)]">
                    {t(workflowLabelKey(workflow))}
                  </p>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
                    {events.length} {t("candidateTrustAuditExport.eventCountLabel")}
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
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.jsonPanel,
          t("candidateTrustAuditExport.jsonPanelTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.jsonPanelLead")}</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)] p-3 text-[10px] leading-relaxed">
              {jsonFull}
            </pre>
          </>,
        )}

        {sectionCard(
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.download,
          t("candidateTrustAuditExport.downloadSectionTitle"),
          <TrustAuditExportPanel record={record} showFullPageLink={false} />,
        )}

        {sectionCard(
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.includedExcludedScope,
          t("candidateTrustAuditExport.includedExcludedTitle"),
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-accent-hover)]">
                  {t("candidateTrustAuditExport.includedColumn")}
                </p>
                <ul className="mt-2 list-inside list-disc text-xs">
                  {record.bundle.included_scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--twin-muted)]">
                  {t("candidateTrustAuditExport.excludedColumn")}
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
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.linkedModules,
          t("candidateTrustAuditExport.linkedModulesTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.linkedModulesLead")}</p>
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
          CANDIDATE_TRUST_AUDIT_EXPORT_MARKERS.boundary,
          t("candidateTrustAuditExport.boundaryTitle"),
          <p>{t("candidateTrustAuditExport.boundaryBody")}</p>,
          "border-amber-500/30 bg-amber-500/5",
        )}
      </div>
    </Shell>
  );
}

type CandidateTrustAuditExportWorkspaceProps = {
  candidateId?: string;
};

export function CandidateTrustAuditExportWorkspace({ candidateId }: CandidateTrustAuditExportWorkspaceProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [livePath, setLivePath] = useState(false);
  const [record, setRecord] = useState<CandidateTrustAuditExportRecord | null>(null);

  const load = useCallback(async () => {
    if (isDemoFixtureCandidateId(candidateId) && isDemoOrDevSurface()) {
      setRecord(resolveCandidateTrustAuditExport(candidateId));
      setLivePath(false);
      setLoading(false);
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace("/login/candidate");
      return;
    }
    setLoading(true);
    try {
      const bundle = await fetchTrustLiveBundle(token);
      const base = resolveCandidateTrustAuditExport() ?? resolveCandidateTrustAuditExport("demo-candidate-001");
      if (!base) {
        setRecord(null);
      } else {
        const liveEvents = (bundle.audit_events.items ?? []).map((ev) => ({
          id: String(ev.id),
          workflow: "trust_center",
          type: ev.event_type,
          at: typeof ev.created_at === "string" ? ev.created_at : String(ev.created_at),
          summary: ev.summary,
          backend_write: false as const,
        }));
        setRecord({
          ...base,
          id: String(bundle.candidate_id),
          display_name: bundle.display_name,
          headline: bundle.trust.twin_knows_summary,
          last_reviewed_at: bundle.generated_at,
          export_label: "LIVE_PATH",
          bundle: {
            ...base.bundle,
            trust_center_events: liveEvents,
          },
        });
      }
      setLivePath(true);
    } catch {
      if (isDemoOrDevSurface()) {
        setRecord(resolveCandidateTrustAuditExport(candidateId));
        setLivePath(false);
      } else {
        setRecord(null);
      }
    } finally {
      setLoading(false);
    }
  }, [candidateId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Shell wide rail>
        <div data-testid="candidate-audit-export-loading" className="space-y-4 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--twin-border)]/60" />
          <div className="h-32 animate-pulse rounded bg-[var(--twin-border)]/40" />
        </div>
      </Shell>
    );
  }

  if (!record) {
    return (
      <Shell wide rail>
        <div className="space-y-4 p-6">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateTrustAuditExport.notFoundMessage")}</p>
          <button type="button" className="twin-btn-secondary twin-touch-target" onClick={() => void load()}>
            {t("candidateTrustAuditExport.notFoundCta")}
          </button>
        </div>
      </Shell>
    );
  }

  return <TrustAuditExportContent record={record} livePath={livePath} />;
}
