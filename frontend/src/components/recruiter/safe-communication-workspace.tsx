"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import type { TranslationKey } from "@/lib/i18n";
import { jobPipelineHref } from "@/lib/job-pipeline";
import type {
  CandidateSafeCommunicationRecord,
  CommunicationAuditEventType,
  CommunicationDraft,
  DraftPurpose,
  DraftRecipientType,
  DraftStatus,
  DraftTone,
  JobSafeCommunicationRecord,
} from "@/lib/safe-communication-demo-data";
import {
  candidateCommunicationHref,
  jobCommunicationHref,
  jobDraftsHref,
  jobsListHref,
  resolveCandidateSafeCommunication,
  resolveJobSafeCommunication,
  SAFE_COMMUNICATION_MARKERS,
  SAFE_COMMUNICATION_PAGE_MARKER,
  type SafeCommunicationSurface,
  type SafeCommunicationView,
} from "@/lib/safe-communication";
import { candidateTeamHref, jobTasksHref, jobTeamHref } from "@/lib/team-collaboration";

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

function recipientTypeKey(type: DraftRecipientType): TranslationKey {
  const map: Record<DraftRecipientType, TranslationKey> = {
    candidate: "safeCommunication.recipientCandidate",
    hiring_manager: "safeCommunication.recipientHiringManager",
    internal: "safeCommunication.recipientInternal",
    consent_reviewer: "safeCommunication.recipientConsentReviewer",
  };
  return map[type];
}

function purposeKey(purpose: DraftPurpose): TranslationKey {
  const map: Record<DraftPurpose, TranslationKey> = {
    intro_status: "safeCommunication.purposeIntroStatus",
    hm_feedback_request: "safeCommunication.purposeHmFeedback",
    follow_up: "safeCommunication.purposeFollowUp",
    internal_summary: "safeCommunication.purposeInternalSummary",
    consent_review_request: "safeCommunication.purposeConsentReview",
  };
  return map[purpose];
}

function toneKey(tone: DraftTone): TranslationKey {
  const map: Record<DraftTone, TranslationKey> = {
    professional: "safeCommunication.toneProfessional",
    warm: "safeCommunication.toneWarm",
    formal: "safeCommunication.toneFormal",
    internal: "safeCommunication.toneInternal",
  };
  return map[tone];
}

function draftStatusKey(status: DraftStatus): TranslationKey {
  const map: Record<DraftStatus, TranslationKey> = {
    draft: "safeCommunication.statusDraft",
    needs_review: "safeCommunication.statusNeedsReview",
    blocked: "safeCommunication.statusBlocked",
  };
  return map[status];
}

function auditTypeKey(type: CommunicationAuditEventType): TranslationKey {
  const map: Record<CommunicationAuditEventType, TranslationKey> = {
    draft_created: "safeCommunication.auditDraftCreated",
    consent_review: "safeCommunication.auditConsentReview",
    feedback_prepared: "safeCommunication.auditFeedbackPrepared",
    profile_reviewed: "safeCommunication.auditProfileReviewed",
  };
  return map[type];
}

function checklistItemKey(item: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    consent_reviewed: "safeCommunication.checkConsentReviewed",
    fit_evidence_attached: "safeCommunication.checkFitEvidence",
    tone_approved: "safeCommunication.checkToneApproved",
    scorecard_linked: "safeCommunication.checkScorecardLinked",
    evidence_complete: "safeCommunication.checkEvidenceComplete",
    deadline_set: "safeCommunication.checkDeadlineSet",
    consent_cleared: "safeCommunication.checkConsentCleared",
    contact_permission_live: "safeCommunication.checkContactPermission",
    human_approval: "safeCommunication.checkHumanApproval",
    no_pii_leak: "safeCommunication.checkNoPiiLeak",
    internal_only_confirmed: "safeCommunication.checkInternalOnly",
    consent_source_verified: "safeCommunication.checkConsentSource",
    allowed_use_checked: "safeCommunication.checkAllowedUse",
    retention_noted: "safeCommunication.checkRetentionNoted",
  };
  return map[item] ?? "safeCommunication.checkConsentReviewed";
}

function CommunicationNotFound({
  surface,
  kind,
}: {
  surface: SafeCommunicationSurface;
  kind: "candidate" | "job";
}) {
  const { t } = useTranslation();
  const back = jobsListHref(surface);

  return (
    <Shell wide rail>
      <div data-testid={SAFE_COMMUNICATION_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("safeCommunication.notFoundTitle")}
          message={t("safeCommunication.notFoundMessage")}
          steps={[
            t("safeCommunication.notFoundStep1"),
            t("safeCommunication.notFoundStep2"),
            t("safeCommunication.notFoundStep3"),
          ]}
          actionLabel={t("safeCommunication.notFoundCta")}
          actionHref={kind === "candidate" ? candidateProfile360Href("demo-candidate-001", surface) : back}
        />
      </div>
    </Shell>
  );
}

type SharedContentProps = {
  surface: SafeCommunicationSurface;
  view: SafeCommunicationView;
  header: ReactNode;
  record: CandidateSafeCommunicationRecord | JobSafeCommunicationRecord;
  candidateId?: string;
  jobId?: string;
};

function DraftActions({
  draft,
  onCopy,
  copied,
}: {
  draft: CommunicationDraft;
  onCopy: () => void;
  copied: boolean;
}) {
  const { t } = useTranslation();
  const disabledActions = [
    { key: "send", label: "safeCommunication.actionSend" as TranslationKey },
    { key: "schedule", label: "safeCommunication.actionSchedule" as TranslationKey },
    { key: "sequence", label: "safeCommunication.actionSequence" as TranslationKey },
    { key: "mailbox", label: "safeCommunication.actionMailbox" as TranslationKey },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="rounded border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--twin-surface-raised)]"
        data-testid="safe-communication-copy-draft"
      >
        {copied ? t("safeCommunication.copySuccess") : t("safeCommunication.copyDraft")}
      </button>
      {disabledActions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled
          className="cursor-not-allowed rounded border border-[var(--twin-border)] px-3 py-1.5 text-xs font-medium opacity-50"
          title={t("safeCommunication.actionNotLiveHint")}
          data-testid={`safe-communication-action-${action.key}-disabled`}
        >
          {t(action.label)} · {t("safeCommunication.notLive")}
        </button>
      ))}
    </div>
  );
}

function CommunicationContent({ surface, view, header, record, candidateId, jobId }: SharedContentProps) {
  const { t } = useTranslation();
  const [selectedDraftId, setSelectedDraftId] = useState(record.default_draft_id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (view === "drafts") {
      document.getElementById("safe-communication-draft-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  const selectedDraft = useMemo(
    () => record.drafts.find((d) => d.id === selectedDraftId) ?? record.drafts[0],
    [record.drafts, selectedDraftId],
  );

  const profileHref = candidateId
    ? candidateProfile360Href(candidateId, surface)
    : candidateProfile360Href("demo-candidate-001", surface);
  const pipelineHref = jobId
    ? jobPipelineHref(jobId, surface)
    : jobPipelineHref("demo-role-001", surface);
  const trustHref = candidateId
    ? candidateTrustHref(candidateId, surface)
    : candidateTrustHref("demo-candidate-001", surface);
  const teamHref = candidateId
    ? candidateTeamHref(candidateId, surface)
    : jobId
      ? jobTeamHref(jobId, surface)
      : candidateTeamHref("demo-candidate-001", surface);
  const tasksHref = jobId ? jobTasksHref(jobId, surface) : jobTasksHref("demo-role-001", surface);
  const communicationHref = candidateId
    ? candidateCommunicationHref(candidateId, surface)
    : jobId
      ? jobCommunicationHref(jobId, surface)
      : candidateCommunicationHref("demo-candidate-001", surface);
  const draftsHref = jobId ? jobDraftsHref(jobId, surface) : jobDraftsHref("demo-role-001", surface);

  const handleCopy = useCallback(async () => {
    const text = `Subject: ${selectedDraft.subject}\n\n${selectedDraft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [selectedDraft]);

  return (
    <Shell wide rail>
      <div data-safe-communication-page={SAFE_COMMUNICATION_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        {header}

        {sectionCard(
          SAFE_COMMUNICATION_MARKERS.consentWarning,
          t("safeCommunication.consentWarningTitle"),
          <>
            <p className="font-medium text-amber-200">{t("safeCommunication.consentWarningLead")}</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-[var(--twin-muted-strong)]">
              <li>{t("safeCommunication.consentPointReview")}</li>
              <li>{t("safeCommunication.consentPointNoOutreach")}</li>
              <li>{t("safeCommunication.consentPointNoSent")}</li>
              <li>{t("safeCommunication.consentPointDraftOnly")}</li>
            </ul>
          </>,
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {sectionCard(
            SAFE_COMMUNICATION_MARKERS.draftLibrary,
            t("safeCommunication.draftLibraryTitle"),
            <>
              <p className="twin-muted text-xs">{t("safeCommunication.draftLibraryLead")}</p>
              <ul id="safe-communication-draft-library" className="space-y-2">
                {record.drafts.map((draft) => (
                  <li key={draft.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDraftId(draft.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        selectedDraft.id === draft.id
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-[var(--twin-border)]/60 hover:bg-[var(--twin-surface-soft)]"
                      }`}
                      data-testid={`safe-communication-draft-item-${draft.id}`}
                    >
                      <p className="font-semibold">{draft.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[var(--twin-muted-strong)]">
                        <span>{t(recipientTypeKey(draft.recipient_type))}</span>
                        <span>·</span>
                        <span>{t(purposeKey(draft.purpose))}</span>
                        <span>·</span>
                        <span>{t(toneKey(draft.tone))}</span>
                        <span>·</span>
                        <span>{t(draftStatusKey(draft.status))}</span>
                      </div>
                      <p className="mt-1 text-[var(--twin-muted-strong)]">
                        {draft.owner_label} · {draft.created_at.slice(0, 10)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            SAFE_COMMUNICATION_MARKERS.draftPreview,
            t("safeCommunication.draftPreviewTitle"),
            <>
              <p className="twin-muted text-xs">{t("safeCommunication.draftPreviewLead")}</p>
              <div className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/50 p-4">
                <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("safeCommunication.subjectLabel")}
                </p>
                <p className="mt-1 font-medium">{selectedDraft.subject}</p>
                <p className="mt-4 text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                  {t("safeCommunication.bodyLabel")}
                </p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed">{selectedDraft.body}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold">{t("safeCommunication.placeholderVars")}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {selectedDraft.placeholder_variables.map((v) => (
                    <li
                      key={v}
                      className="rounded bg-[var(--twin-surface-soft)] px-2 py-0.5 font-mono text-[10px]"
                    >
                      {`{{${v}}}`}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold">{t("safeCommunication.reviewChecklist")}</p>
                <ul className="mt-2 space-y-1">
                  {selectedDraft.review_checklist.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs">
                      <span className="text-amber-200">○</span>
                      {t(checklistItemKey(item))}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                {t("safeCommunication.trustBoundary")}
              </p>
            </>,
          )}

          {sectionCard(
            SAFE_COMMUNICATION_MARKERS.actions,
            t("safeCommunication.actionsTitle"),
            <>
              <p className="twin-muted text-xs">{t("safeCommunication.actionsLead")}</p>
              <DraftActions draft={selectedDraft} onCopy={handleCopy} copied={copied} />
            </>,
          )}

          {sectionCard(
            SAFE_COMMUNICATION_MARKERS.internalUpdate,
            t("safeCommunication.internalUpdateTitle"),
            <>
              <p className="font-medium">{record.internal_update.status}</p>
              <div className="mt-3">
                <p className="text-xs font-semibold">{t("safeCommunication.openQuestions")}</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  {record.internal_update.open_questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs">
                <span className="font-semibold">{t("safeCommunication.nextDecision")}:</span>{" "}
                {record.internal_update.next_decision}
              </p>
              <p className="text-xs">
                <span className="font-semibold">{t("safeCommunication.followUpOwner")}:</span>{" "}
                {record.internal_update.follow_up_owner}
              </p>
              <Link
                href={tasksHref}
                className="twin-link mt-2 inline-block text-xs font-medium"
                data-testid="safe-communication-team-tasks-link"
              >
                {t("safeCommunication.openTeamTasks")}
              </Link>
            </>,
          )}

          {sectionCard(
            SAFE_COMMUNICATION_MARKERS.communicationAudit,
            t("safeCommunication.auditTitle"),
            <>
              <p className="twin-muted text-xs">{t("safeCommunication.auditLead")}</p>
              <ul className="space-y-2 border-l border-[var(--twin-border)] pl-4">
                {record.audit_events.map((event) => (
                  <li key={`${event.type}-${event.at}`} className="text-xs">
                    <span className="font-semibold">{t(auditTypeKey(event.type))}</span>
                    <span className="twin-muted">
                      {" "}
                      · {event.at.slice(0, 10)} · {event.actor}
                    </span>
                    <p className="twin-muted mt-0.5">{event.summary}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-medium text-emerald-200/90">{t("safeCommunication.auditNoOutbound")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <Link href={profileHref} className="twin-link font-medium" data-testid="safe-communication-profile-link">
                  {t("safeCommunication.auditProfile360")}
                </Link>
                <Link href={pipelineHref} className="twin-link font-medium" data-testid="safe-communication-pipeline-link">
                  {t("safeCommunication.auditPipeline")}
                </Link>
                <Link href={trustHref} className="twin-link font-medium" data-testid="safe-communication-trust-link">
                  {t("safeCommunication.auditTrust")}
                </Link>
                <Link href={teamHref} className="twin-link font-medium" data-testid="safe-communication-team-link">
                  {t("safeCommunication.auditTeam")}
                </Link>
                <Link href={draftsHref} className="twin-link font-medium" data-testid="safe-communication-drafts-link">
                  {t("safeCommunication.auditDrafts")}
                </Link>
                <Link
                  href={communicationHref}
                  className="twin-link font-medium"
                  data-testid="safe-communication-self-link"
                >
                  {t("safeCommunication.auditCommunication")}
                </Link>
              </div>
            </>,
            "lg:col-span-2",
          )}
        </div>

        {sectionCard(
          SAFE_COMMUNICATION_MARKERS.humanDecisionBoundary,
          t("safeCommunication.boundaryTitle"),
          <p>{t("safeCommunication.boundaryBody")}</p>,
        )}
      </div>
    </Shell>
  );
}

function CandidateHeader({
  record,
  surface,
  view,
}: {
  record: CandidateSafeCommunicationRecord;
  surface: SafeCommunicationSurface;
  view: SafeCommunicationView;
}) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={SAFE_COMMUNICATION_MARKERS.header}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("safeCommunication.pageEyebrow")}
            {view === "drafts" ? ` · ${t("safeCommunication.draftsFocus")}` : ""}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{record.display_name}</h1>
          <p className="twin-muted mt-1 text-sm">
            {record.role_title} · {record.role_id}
          </p>
        </div>
        <span
          className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200"
          data-testid={SAFE_COMMUNICATION_MARKERS.pilotBadge}
        >
          {t("safeCommunication.pilotBadge")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
          {t("safeCommunication.draftOnlyStatus")}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("safeCommunication.consentBadge")}: {record.consent_badge}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("safeCommunication.decisionOwner")}: {record.decision_owner}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-amber-200">{t("safeCommunication.humanReviewRequired")}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={candidateProfile360Href(record.id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openProfile360")}
        </Link>
        <Link href={jobPipelineHref(record.role_id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openPipeline")}
        </Link>
        <Link href={candidateTeamHref(record.id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openTeam")}
        </Link>
        <Link href={candidateTrustHref(record.id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openTrust")}
        </Link>
      </div>
    </Card>
  );
}

function JobHeader({
  record,
  surface,
  view,
}: {
  record: JobSafeCommunicationRecord;
  surface: SafeCommunicationSurface;
  view: SafeCommunicationView;
}) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={SAFE_COMMUNICATION_MARKERS.header}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("safeCommunication.pageEyebrow")}
            {view === "drafts" ? ` · ${t("safeCommunication.draftsFocus")}` : ""}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{record.title}</h1>
          <p className="twin-muted mt-1 text-sm">
            {record.department} · {record.role_id}
          </p>
        </div>
        <span
          className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200"
          data-testid={SAFE_COMMUNICATION_MARKERS.pilotBadge}
        >
          {t("safeCommunication.pilotBadge")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
          {t("safeCommunication.draftOnlyStatus")}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("safeCommunication.consentBadge")}: {record.consent_badge}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("safeCommunication.decisionOwner")}: {record.decision_owner}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-amber-200">{t("safeCommunication.humanReviewRequired")}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={jobPipelineHref(record.role_id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openPipeline")}
        </Link>
        <Link href={jobCommunicationHref(record.role_id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openCommunication")}
        </Link>
        <Link href={jobDraftsHref(record.role_id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openDrafts")}
        </Link>
        <Link href={jobTeamHref(record.role_id, surface)} className="twin-link font-medium">
          {t("safeCommunication.openTeam")}
        </Link>
      </div>
    </Card>
  );
}

export function CandidateSafeCommunicationWorkspace({
  candidateId,
  surface,
  view = "communication",
}: {
  candidateId: string;
  surface: SafeCommunicationSurface;
  view?: SafeCommunicationView;
}) {
  const record = useMemo(() => resolveCandidateSafeCommunication(candidateId), [candidateId]);

  if (!record) {
    return <CommunicationNotFound surface={surface} kind="candidate" />;
  }

  return (
    <CommunicationContent
      surface={surface}
      view={view}
      record={record}
      candidateId={candidateId}
      header={<CandidateHeader record={record} surface={surface} view={view} />}
    />
  );
}

export function JobSafeCommunicationWorkspace({
  jobId,
  surface,
  view = "communication",
}: {
  jobId: string;
  surface: SafeCommunicationSurface;
  view?: SafeCommunicationView;
}) {
  const record = useMemo(() => resolveJobSafeCommunication(jobId), [jobId]);

  if (!record) {
    return <CommunicationNotFound surface={surface} kind="job" />;
  }

  return (
    <CommunicationContent
      surface={surface}
      view={view}
      record={record}
      jobId={jobId}
      header={<JobHeader record={record} surface={surface} view={view} />}
    />
  );
}
