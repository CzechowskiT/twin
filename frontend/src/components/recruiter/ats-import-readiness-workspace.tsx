"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  ATS_IMPORT_READINESS_MARKERS,
  ATS_IMPORT_READINESS_PAGE_MARKER,
  atsImportReadinessHref,
  atsIntegrationsHref,
  isValidAtsImportView,
  resolveAtsImportReadiness,
  type AtsImportReadinessSurface,
  type AtsImportReadinessView,
} from "@/lib/ats-import-readiness";
import type {
  AtsConnectorRow,
  ConnectorReadinessStatus,
  ImportAuditEventType,
  ImportChecklistItem,
  ImportRiskFlag,
} from "@/lib/ats-import-readiness-demo-data";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { decisionMemoryHref } from "@/lib/decision-memory";
import type { TranslationKey } from "@/lib/i18n";
import { jobPipelineHref } from "@/lib/job-pipeline";
import { RECRUITER_TALENT_POOL_ROUTE } from "@/lib/recruiter-talent-pool";

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

function connectorStatusKey(status: ConnectorReadinessStatus): TranslationKey {
  const map: Record<ConnectorReadinessStatus, TranslationKey> = {
    mapping_ready_not_live: "atsImportReadiness.connectorMappingReadyNotLive",
    planned: "atsImportReadiness.connectorPlanned",
    pilot_ready: "atsImportReadiness.connectorPilotReady",
  };
  return map[status];
}

function checklistStatusKey(status: ImportChecklistItem["status"]): TranslationKey {
  const map: Record<ImportChecklistItem["status"], TranslationKey> = {
    pending_review: "atsImportReadiness.checklistPendingReview",
    mapped: "atsImportReadiness.checklistMapped",
    blocked: "atsImportReadiness.checklistBlocked",
  };
  return map[status];
}

function checklistItemKey(item: ImportChecklistItem): TranslationKey {
  const map: Record<string, TranslationKey> = {
    checkConnectorSelected: "atsImportReadiness.checkConnectorSelected",
    checkFieldMappingReviewed: "atsImportReadiness.checkFieldMappingReviewed",
    checkDedupeReviewed: "atsImportReadiness.checkDedupeReviewed",
    checkConsentMappingReviewed: "atsImportReadiness.checkConsentMappingReviewed",
    checkPiiMinimized: "atsImportReadiness.checkPiiMinimized",
    checkNoWritebackConfirmed: "atsImportReadiness.checkNoWritebackConfirmed",
    checkHumanReviewOwner: "atsImportReadiness.checkHumanReviewOwner",
    checkPilotScopeAcknowledged: "atsImportReadiness.checkPilotScopeAcknowledged",
  };
  return map[item.label_key] ?? "atsImportReadiness.checkConnectorSelected";
}

function riskSeverityKey(severity: ImportRiskFlag["severity"]): TranslationKey {
  const map: Record<ImportRiskFlag["severity"], TranslationKey> = {
    info: "atsImportReadiness.riskInfo",
    warning: "atsImportReadiness.riskWarning",
    review: "atsImportReadiness.riskReview",
  };
  return map[severity];
}

function auditTypeKey(type: ImportAuditEventType): TranslationKey {
  const map: Record<ImportAuditEventType, TranslationKey> = {
    mapping_previewed: "atsImportReadiness.auditMappingPreviewed",
    dedupe_reviewed: "atsImportReadiness.auditDedupeReviewed",
    consent_mapped: "atsImportReadiness.auditConsentMapped",
    validation_checklist_opened: "atsImportReadiness.auditValidationOpened",
    human_review_noted: "atsImportReadiness.auditHumanReviewNoted",
  };
  return map[type];
}

function AtsImportNotFound({ surface }: { surface: AtsImportReadinessSurface }) {
  const { t } = useTranslation();

  return (
    <Shell wide rail>
      <div data-testid={ATS_IMPORT_READINESS_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("atsImportReadiness.notFoundTitle")}
          message={t("atsImportReadiness.notFoundMessage")}
          steps={[
            t("atsImportReadiness.notFoundStep1"),
            t("atsImportReadiness.notFoundStep2"),
            t("atsImportReadiness.notFoundStep3"),
          ]}
          actionLabel={t("atsImportReadiness.notFoundCta")}
          actionHref={atsImportReadinessHref(surface)}
        />
      </div>
    </Shell>
  );
}

function ConnectorRow({ row }: { row: AtsConnectorRow }) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 p-3">
      <span className="font-medium">{row.name}</span>
      <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
        {t(connectorStatusKey(row.status))}
      </span>
      <p className="w-full text-xs text-[var(--twin-muted-strong)]">{row.note}</p>
    </li>
  );
}

type WorkspaceProps = {
  surface: AtsImportReadinessSurface;
  view: AtsImportReadinessView;
};

function AtsImportReadinessContent({ surface, view }: WorkspaceProps) {
  const { t } = useTranslation();
  const record = useMemo(() => resolveAtsImportReadiness(), []);
  const sample = record?.sample_candidate;

  useEffect(() => {
    if (view === "mapping") {
      document.getElementById("ats-import-field-mapping-focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (view === "deduplication") {
      document.getElementById("ats-import-dedupe-focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  if (!record) return null;

  const talentPoolHref = surface === "company" ? "/company/talent-pool" : RECRUITER_TALENT_POOL_ROUTE;
  const talentPoolImportHref = surface === "recruiter" ? "/recruiter/talent-pool/import" : talentPoolHref;

  return (
    <Shell wide rail>
      {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
      <div data-ats-import-readiness-page={ATS_IMPORT_READINESS_PAGE_MARKER} className="space-y-6">
        <header
          className="space-y-3 rounded-xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-soft)]/40 p-5 sm:p-6"
          data-testid={ATS_IMPORT_READINESS_MARKERS.header}
        >
          <div className="flex flex-wrap items-center gap-2">
            <WorkspaceStatusBadge status="pilot" testId={ATS_IMPORT_READINESS_MARKERS.pilotBadge} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("atsImportReadiness.pageEyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("atsImportReadiness.title")}</h1>
          <p className="twin-muted max-w-3xl text-sm leading-relaxed">{t("atsImportReadiness.lead")}</p>
          <p className="text-xs font-medium text-[var(--twin-muted-strong)]">{t("atsImportReadiness.humanReviewRequired")}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href={talentPoolHref} className="twin-link font-medium" data-testid="ats-import-readiness-talent-pool-link">
              {t("atsImportReadiness.openTalentPool")}
            </Link>
            {sample ? (
              <>
                <Link
                  href={candidateProfile360Href(sample.candidate_id, surface)}
                  className="twin-link font-medium"
                  data-testid="ats-import-readiness-profile-360-link"
                >
                  {t("atsImportReadiness.openProfile360")}
                </Link>
                <Link
                  href={candidateTrustHref(sample.candidate_id, surface)}
                  className="twin-link font-medium"
                  data-testid="ats-import-readiness-trust-link"
                >
                  {t("atsImportReadiness.openTrust")}
                </Link>
                <Link
                  href={jobPipelineHref(sample.role_id, surface)}
                  className="twin-link font-medium"
                  data-testid="ats-import-readiness-pipeline-link"
                >
                  {t("atsImportReadiness.openPipeline")}
                </Link>
              </>
            ) : null}
            <Link href={atsIntegrationsHref(surface)} className="twin-link font-medium">
              {t("atsImportReadiness.backIntegrations")}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href={atsImportReadinessHref(surface, "import-readiness")}
              className={`rounded border px-2 py-1 ${view === "import-readiness" ? "border-[var(--twin-accent)] font-semibold" : "border-[var(--twin-border)]"}`}
            >
              {t("atsImportReadiness.viewImportReadiness")}
            </Link>
            <Link
              href={atsImportReadinessHref(surface, "mapping")}
              className={`rounded border px-2 py-1 ${view === "mapping" ? "border-[var(--twin-accent)] font-semibold" : "border-[var(--twin-border)]"}`}
            >
              {t("atsImportReadiness.viewMapping")}
            </Link>
            {surface === "recruiter" ? (
              <Link
                href={atsImportReadinessHref(surface, "deduplication")}
                className={`rounded border px-2 py-1 ${view === "deduplication" ? "border-[var(--twin-accent)] font-semibold" : "border-[var(--twin-border)]"}`}
              >
                {t("atsImportReadiness.viewDeduplication")}
              </Link>
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.connectorMatrix,
            t("atsImportReadiness.connectorMatrixTitle"),
            <>
              <p className="twin-muted text-xs">{t("atsImportReadiness.connectorMatrixLead")}</p>
              <ul className="space-y-2">
                {record.connectors.map((row) => (
                  <ConnectorRow key={row.id} row={row} />
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.fieldMapping,
            t("atsImportReadiness.fieldMappingTitle"),
            <>
              <p id="ats-import-field-mapping-focus" className="twin-muted text-xs">
                {t("atsImportReadiness.fieldMappingLead")}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--twin-border)]">
                      <th className="py-2 pr-3 font-semibold">{t("atsImportReadiness.atsFieldCol")}</th>
                      <th className="py-2 pr-3 font-semibold">{t("atsImportReadiness.twinFieldCol")}</th>
                      <th className="py-2 pr-3 font-semibold">{t("atsImportReadiness.transformCol")}</th>
                      <th className="py-2 font-semibold">{t("atsImportReadiness.reviewCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.field_mappings.map((row) => (
                      <tr key={row.ats_field} className="border-b border-[var(--twin-border)]/50">
                        <td className="py-2 pr-3 font-mono text-[11px]">{row.ats_field}</td>
                        <td className="py-2 pr-3 font-mono text-[11px]">{row.twin_field}</td>
                        <td className="py-2 pr-3">{row.transform}</td>
                        <td className="py-2">
                          {row.review_required ? t("atsImportReadiness.reviewRequired") : t("atsImportReadiness.reviewOptional")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>,
          )}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.dedupePreview,
            t("atsImportReadiness.dedupeTitle"),
            <>
              <p id="ats-import-dedupe-focus" className="twin-muted text-xs">
                {t("atsImportReadiness.dedupeLead")}
              </p>
              <ul className="space-y-3">
                {record.dedupe_rules.map((rule) => (
                  <li key={rule.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3 text-xs">
                    <p className="font-semibold">{rule.strategy}</p>
                    <p className="mt-1 text-[var(--twin-muted-strong)]">{rule.signal}</p>
                    <p className="mt-1">{rule.demo_match}</p>
                    <p className="mt-2 font-medium text-amber-600 dark:text-amber-300">
                      {t("atsImportReadiness.humanReviewRequired")}
                    </p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.consentMapping,
            t("atsImportReadiness.consentMappingTitle"),
            <>
              <p className="twin-muted text-xs">{t("atsImportReadiness.consentMappingLead")}</p>
              <ul className="space-y-3">
                {record.consent_mappings.map((row) => (
                  <li key={row.ats_signal} className="rounded-lg border border-[var(--twin-border)]/60 p-3 text-xs">
                    <p>
                      <span className="font-semibold">{row.ats_signal}</span> → {row.twin_field}
                    </p>
                    <p className="mt-1 text-[var(--twin-muted-strong)]">{row.note}</p>
                    <p className="mt-2 font-medium text-amber-600 dark:text-amber-300">
                      {t("atsImportReadiness.privacyReviewRequired")}
                    </p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.validationChecklist,
            t("atsImportReadiness.validationTitle"),
            <>
              <p className="twin-muted text-xs">{t("atsImportReadiness.validationLead")}</p>
              <ul className="space-y-2">
                {record.validation_checklist.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--twin-border)]/60 px-3 py-2 text-xs">
                    <span>{t(checklistItemKey(item))}</span>
                    <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                      {t(checklistStatusKey(item.status))}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.riskFlags,
            t("atsImportReadiness.riskFlagsTitle"),
            <>
              <p className="twin-muted text-xs">{t("atsImportReadiness.riskFlagsLead")}</p>
              <ul className="space-y-2">
                {record.risk_flags.map((flag) => (
                  <li key={flag.id} className="rounded-lg border border-[var(--twin-border)]/60 p-3 text-xs">
                    <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                      {t(riskSeverityKey(flag.severity))}
                    </span>
                    <p className="mt-2">{flag.summary}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sample
            ? sectionCard(
                ATS_IMPORT_READINESS_MARKERS.sampleCandidate,
                t("atsImportReadiness.sampleCandidateTitle"),
                <>
                  <p className="twin-muted text-xs">{t("atsImportReadiness.sampleCandidateLead")}</p>
                  <p>
                    <span className="font-medium">{t("atsImportReadiness.sampleCandidateLabel")}:</span>{" "}
                    {sample.candidate_id} → {sample.role_id}
                  </p>
                  <p>
                    <span className="font-medium">{t("atsImportReadiness.sampleNameLabel")}:</span> {sample.display_name}
                  </p>
                  <p>
                    <span className="font-medium">{t("atsImportReadiness.sampleRoleLabel")}:</span> {sample.role_title}
                  </p>
                  <p>
                    <span className="font-medium">{t("atsImportReadiness.sampleSourceLabel")}:</span>{" "}
                    {sample.import_source_label}
                  </p>
                  <p>
                    <span className="font-medium">{t("atsImportReadiness.sampleConsentLabel")}:</span>{" "}
                    {sample.consent_status}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={candidateProfile360Href(sample.candidate_id, surface)}
                      className="twin-link font-medium"
                      data-testid="ats-import-readiness-sample-profile-link"
                    >
                      {t("atsImportReadiness.openProfile360")}
                    </Link>
                    <Link
                      href={jobPipelineHref(sample.role_id, surface)}
                      className="twin-link font-medium"
                      data-testid="ats-import-readiness-sample-pipeline-link"
                    >
                      {t("atsImportReadiness.openPipeline")}
                    </Link>
                    <Link
                      href={talentPoolImportHref}
                      className="twin-link font-medium"
                      data-testid="ats-import-readiness-talent-pool-import-link"
                    >
                      {t("atsImportReadiness.openTalentPoolImport")}
                    </Link>
                  </div>
                </>,
                "lg:col-span-2",
              )
            : null}

          {sectionCard(
            ATS_IMPORT_READINESS_MARKERS.auditTrail,
            t("atsImportReadiness.auditTitle"),
            <>
              <p className="twin-muted text-xs">{t("atsImportReadiness.auditLead")}</p>
              <ul className="space-y-2">
                {record.audit_events.map((event) => (
                  <li key={`${event.type}-${event.at}`} className="flex gap-3 text-xs">
                    <span className="shrink-0 rounded bg-[var(--twin-surface-soft)] px-2 py-0.5 font-medium">
                      {t(auditTypeKey(event.type))}
                    </span>
                    <span>
                      {event.at.slice(0, 10)} — {event.actor}: {event.summary}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs italic text-[var(--twin-muted-strong)]">{t("atsImportReadiness.auditNoSync")}</p>
              <Link
                href={decisionMemoryHref("demo-candidate-001", surface)}
                className="twin-link mt-3 inline-block text-xs font-medium"
                data-testid="ats-import-readiness-decision-memory-link"
              >
                {t("decisionMemory.openDecisionMemory")}
              </Link>
            </>,
            "lg:col-span-2",
          )}
        </div>

        <Card
          variant="soft"
          className="border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/40 p-5"
          data-testid={ATS_IMPORT_READINESS_MARKERS.humanReviewBoundary}
        >
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("atsImportReadiness.boundaryTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("atsImportReadiness.boundaryBody")}</p>
        </Card>
      </div>
    </Shell>
  );
}

export function AtsImportReadinessWorkspace({ surface, view }: WorkspaceProps) {
  if (!isValidAtsImportView(view, surface)) {
    return <AtsImportNotFound surface={surface} />;
  }
  return <AtsImportReadinessContent surface={surface} view={view} />;
}

export function AtsImportReadinessInvalidRoute({ surface }: { surface: AtsImportReadinessSurface }) {
  return <AtsImportNotFound surface={surface} />;
}
