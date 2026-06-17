"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { decisionMemoryHref } from "@/lib/decision-memory";
import type {
  CandidateTrustRecord,
  ConsentDataSource,
  ContactChannel,
  ContactHistoryEventType,
} from "@/lib/candidate-trust-demo-data";
import {
  CANDIDATE_TRUST_MARKERS,
  CANDIDATE_TRUST_PAGE_MARKER,
  type CandidateTrustSurface,
  type TrustView,
  resolveCandidateTrust,
  resolveJobTrust,
} from "@/lib/candidate-trust";
import { jobOverviewHref, jobPipelineHref } from "@/lib/job-pipeline";
import type { TranslationKey } from "@/lib/i18n";
import { candidateTeamHref } from "@/lib/team-collaboration";
import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCommunicationHref } from "@/lib/safe-communication";

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

function dataSourceKey(source: ConsentDataSource): TranslationKey {
  const map: Record<ConsentDataSource, TranslationKey> = {
    candidate_submitted: "candidateTrust.sourceCandidateSubmitted",
    ats_import: "candidateTrust.sourceAtsImport",
    recruiter_entry: "candidateTrust.sourceRecruiterEntry",
    referral: "candidateTrust.sourceReferral",
    talent_pool: "candidateTrust.sourceTalentPool",
  };
  return map[source];
}

function channelKey(channel: ContactChannel["channel"]): TranslationKey {
  const map: Record<ContactChannel["channel"], TranslationKey> = {
    email: "candidateTrust.channelEmail",
    phone: "candidateTrust.channelPhone",
    linkedin: "candidateTrust.channelLinkedin",
    automated: "candidateTrust.channelAutomated",
  };
  return map[channel];
}

function channelStatusKey(status: ContactChannel["status"]): TranslationKey {
  const map: Record<ContactChannel["status"], TranslationKey> = {
    review_required: "candidateTrust.channelStatusReviewRequired",
    not_allowed: "candidateTrust.channelStatusNotAllowed",
    not_live: "candidateTrust.channelStatusNotLive",
    prohibited: "candidateTrust.channelStatusProhibited",
  };
  return map[status];
}

function historyEventKey(type: ContactHistoryEventType): TranslationKey {
  const map: Record<ContactHistoryEventType, TranslationKey> = {
    imported: "candidateTrust.eventImported",
    consent_review: "candidateTrust.eventConsentReview",
    talent_radar: "candidateTrust.eventTalentRadar",
    digest: "candidateTrust.eventDigest",
    note: "candidateTrust.eventNote",
    feedback_requested: "candidateTrust.eventFeedbackRequested",
  };
  return map[type];
}

function TrustNotFound({
  surface,
  kind,
}: {
  surface: CandidateTrustSurface;
  kind: "candidate" | "job";
}) {
  const { t } = useTranslation();
  const back =
    kind === "job"
      ? surface === "company"
        ? "/company/roles"
        : "/recruiter/jobs"
      : surface === "company"
        ? "/company/talent-pool"
        : "/recruiter/talent-radar";

  return (
    <Shell wide rail>
      <div data-testid={CANDIDATE_TRUST_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("candidateTrust.notFoundTitle")}
          message={t("candidateTrust.notFoundMessage")}
          steps={[
            t("candidateTrust.notFoundStep1"),
            t("candidateTrust.notFoundStep2"),
            t("candidateTrust.notFoundStep3"),
          ]}
          actionLabel={t("candidateTrust.notFoundCta")}
          actionHref={back}
        />
      </div>
    </Shell>
  );
}

function TrustContent({
  record,
  surface,
  view,
}: {
  record: CandidateTrustRecord;
  surface: CandidateTrustSurface;
  view: TrustView;
}) {
  const { t } = useTranslation();
  const isJobView = view === "job-consent";
  const profileHref = candidateProfile360Href(record.id, surface);
  const pipelineHref = jobPipelineHref(record.role_id, surface);
  const collaborationHref = candidateCollaborationHref(record.id, surface);
  const overviewHref = jobOverviewHref(record.role_id, surface);
  const digestHref = "/recruiter/talent-radar/digest";

  const showConsent = view === "trust" || view === "consent";
  const showDataSource = view === "trust" || view === "consent";
  const showContactPermission = view === "trust" || view === "consent";
  const showHistory = view === "trust" || view === "contact-history";
  const showRetention = view === "trust";
  const showRisk = view === "trust" || view === "consent";
  const showAudit = view === "trust" || view === "contact-history";

  return (
    <Shell wide rail>
      <div data-candidate-trust-page={CANDIDATE_TRUST_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_TRUST_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateTrust.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">
                {isJobView ? record.role_title : record.display_name}
              </h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {isJobView ? t("candidateTrust.jobScopedLead") : record.headline}
              </p>
              {!isJobView ? (
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {record.role_title} · {record.pipeline_stage}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={CANDIDATE_TRUST_MARKERS.pilotBadge}
              >
                {t("candidateTrust.pilotBadge")}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                {t("candidateTrust.consentBadge")}: {record.consent_badge}
              </span>
              <span className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs text-[var(--twin-muted-strong)]">
                {t("candidateTrust.contactPermissionBadge")}: {record.contact_permission_badge}
              </span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("candidateTrust.lastReviewed")}: {record.last_reviewed_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href={profileHref} className="twin-link font-medium" data-testid="candidate-trust-profile-360-link">
              {t("candidateTrust.openProfile360")}
            </Link>
            <Link href={pipelineHref} className="twin-link font-medium" data-testid="candidate-trust-pipeline-link">
              {t("candidateTrust.openPipeline")}
            </Link>
            <Link
              href={collaborationHref}
              className="twin-link font-medium"
              data-testid="candidate-trust-collaboration-link"
            >
              {t("candidateTrust.openCollaboration")}
            </Link>
            <Link href={overviewHref} className="twin-link font-medium">
              {t("candidateTrust.openJobOverview")}
            </Link>
          </div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {t("candidateTrust.humanDecisionRequired")}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {showConsent
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.consentStatus,
                t("candidateTrust.consentStatusTitle"),
                <>
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm font-medium text-amber-200">
                    {t("candidateTrust.consentRequiresReview")}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.consentStatusLabel")}:</span>{" "}
                    {record.consent_status}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.consentSourceLabel")}:</span>{" "}
                    {t(dataSourceKey(record.consent_source))}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.consentRecordedAt")}:</span>{" "}
                    {record.consent_recorded_at.slice(0, 10)}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.consentOwner")}:</span> {record.consent_owner}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.consentConfidence")}:</span>{" "}
                    {t(
                      record.consent_confidence === "pilot_signal"
                        ? "candidateTrust.confidencePilotSignal"
                        : "candidateTrust.confidenceNeedsVerification",
                    )}
                  </p>
                </>,
              )
            : null}

          {showDataSource
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.dataSource,
                t("candidateTrust.dataSourceTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateTrust.notLegalAdvice")}</p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.dataSourceLabel")}:</span>{" "}
                    {t(dataSourceKey(record.data_source))}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.processingContext")}:</span>{" "}
                    {record.processing_context}
                  </p>
                  <p className="text-xs italic text-[var(--twin-muted-strong)]">{record.legal_basis_note}</p>
                  {record.data_source === "ats_import" ? (
                    <Link
                      href={atsImportReadinessHref(surface)}
                      className="twin-link mt-2 inline-block text-xs font-medium"
                      data-testid="candidate-trust-import-readiness-link"
                    >
                      {t("atsImportReadiness.openImportReadiness")}
                    </Link>
                  ) : null}
                  <div>
                    <p className="font-medium">{t("candidateTrust.allowedPurposes")}</p>
                    <ul className="mt-2 list-inside list-disc">
                      {record.allowed_purposes.map((purpose) => (
                        <li key={purpose}>{purpose}</li>
                      ))}
                    </ul>
                  </div>
                </>,
              )
            : null}

          {showContactPermission
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.contactPermission,
                t("candidateTrust.contactPermissionTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateTrust.contactPermissionLead")}</p>
                  <p className="font-medium text-amber-200">{t("candidateTrust.contactAfterReview")}</p>
                  <Link
                    href={candidateCommunicationHref(record.id, surface)}
                    className="twin-link mt-2 inline-block text-xs font-medium"
                    data-testid="candidate-trust-communication-link"
                  >
                    {t("safeCommunication.openCommunication")}
                  </Link>
                  <ul className="space-y-3">
                    {record.contact_channels.map((ch) => (
                      <li
                        key={ch.channel}
                        className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                        data-testid={`candidate-trust-channel-${ch.channel}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{t(channelKey(ch.channel))}</span>
                          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                            {t(channelStatusKey(ch.status))}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{ch.note}</p>
                      </li>
                    ))}
                  </ul>
                </>,
              )
            : null}

          {showHistory
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.contactHistory,
                t("candidateTrust.contactHistoryTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateTrust.contactHistoryLead")}</p>
                  <ul className="space-y-3 border-l border-[var(--twin-border)] pl-4">
                    {record.contact_history.map((event) => (
                      <li key={event.id} data-testid={`candidate-trust-history-${event.id}`}>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded bg-[var(--twin-surface-soft)] px-2 py-0.5 font-semibold">
                            {t(historyEventKey(event.type))}
                          </span>
                          <span className="text-[var(--twin-muted-strong)]">{event.at.slice(0, 10)}</span>
                          <span className="text-[var(--twin-muted-strong)]">· {event.actor}</span>
                        </div>
                        <p className="mt-1 text-sm">{event.summary}</p>
                        <p className="mt-1 text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">
                          {t("candidateTrust.noOutboundSent")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>,
              )
            : null}

          {showRetention
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.retentionReview,
                t("candidateTrust.retentionTitle"),
                <>
                  <p>
                    <span className="font-medium">{t("candidateTrust.retentionStatus")}:</span>{" "}
                    {record.retention_status}
                  </p>
                  <p>
                    <span className="font-medium">{t("candidateTrust.nextReview")}:</span>{" "}
                    {record.next_review_at.slice(0, 10)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] opacity-60"
                      title={t("candidateTrust.reviewDisabledHint")}
                    >
                      {t("candidateTrust.reviewCta")}
                    </button>
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] opacity-60"
                      title={t("candidateTrust.deleteDisabledHint")}
                    >
                      {t("candidateTrust.deleteCta")}
                    </button>
                  </div>
                  <p className="twin-muted text-xs">{t("candidateTrust.noMutation")}</p>
                </>,
              )
            : null}

          {showRisk
            ? sectionCard(
                CANDIDATE_TRUST_MARKERS.riskFlags,
                t("candidateTrust.riskFlagsTitle"),
                <ul className="space-y-3">
                  {record.risk_flags.map((flag) => (
                    <li
                      key={flag.id}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                      data-testid={`candidate-trust-risk-${flag.id}`}
                    >
                      <p className="font-semibold text-amber-200">{flag.label}</p>
                      <p className="mt-1 text-xs">{flag.detail}</p>
                    </li>
                  ))}
                </ul>,
              )
            : null}
        </div>

        {sectionCard(
          CANDIDATE_TRUST_MARKERS.boundary,
          t("candidateTrust.boundaryTitle"),
          <p>{t("candidateTrust.boundaryBody")}</p>,
        )}

        {showAudit
          ? sectionCard(
              CANDIDATE_TRUST_MARKERS.auditConnections,
              t("candidateTrust.auditTitle"),
              <>
                <p className="twin-muted text-xs">{t("candidateTrust.auditLead")}</p>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href={profileHref} className="twin-link font-medium">
                      {t("candidateTrust.auditProfile360")}
                    </Link>
                  </li>
                  <li>
                    <Link href={collaborationHref} className="twin-link font-medium">
                      {t("candidateTrust.auditCollaboration")}
                    </Link>
                  </li>
                  <li>
                    <Link href={pipelineHref} className="twin-link font-medium">
                      {t("candidateTrust.auditPipeline")}
                    </Link>
                  </li>
                  <li>
                    <Link href={digestHref} className="twin-link font-medium">
                      {t("candidateTrust.auditDigest")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={candidateTeamHref(record.id, surface)}
                      className="twin-link font-medium"
                      data-testid="candidate-trust-team-link"
                    >
                      {t("teamCollaboration.openTeamWorkspace")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={decisionMemoryHref(record.id, surface)}
                      className="twin-link font-medium"
                      data-testid="candidate-trust-decision-memory-link"
                    >
                      {t("decisionMemory.openDecisionMemory")}
                    </Link>
                  </li>
                </ul>
              </>,
            )
          : null}
      </div>
    </Shell>
  );
}

type CandidateTrustWorkspaceProps = {
  candidateId: string;
  surface: CandidateTrustSurface;
  view?: TrustView;
};

export function CandidateTrustWorkspace({
  candidateId,
  surface,
  view = "trust",
}: CandidateTrustWorkspaceProps) {
  const record = useMemo(() => resolveCandidateTrust(candidateId), [candidateId]);

  if (!record) {
    return <TrustNotFound surface={surface} kind="candidate" />;
  }

  return <TrustContent record={record} surface={surface} view={view} />;
}

type JobTrustWorkspaceProps = {
  jobId: string;
  surface: CandidateTrustSurface;
};

export function JobTrustWorkspace({ jobId, surface }: JobTrustWorkspaceProps) {
  const record = useMemo(() => resolveJobTrust(jobId), [jobId]);

  if (!record) {
    return <TrustNotFound surface={surface} kind="job" />;
  }

  return <TrustContent record={record} surface={surface} view="job-consent" />;
}
