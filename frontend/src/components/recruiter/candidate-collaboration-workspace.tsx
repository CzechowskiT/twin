"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import type { CandidateCollaborationRecord, ScorecardCriterionId } from "@/lib/candidate-collaboration-demo-data";
import {
  CANDIDATE_COLLABORATION_MARKERS,
  CANDIDATE_COLLABORATION_PAGE_MARKER,
  candidateFeedbackHref,
  candidateScorecardHref,
  type CandidateCollaborationSurface,
  type CollaborationView,
  jobFeedbackHref,
  jobScorecardsHref,
  resolveCandidateCollaboration,
  resolveJobCollaboration,
} from "@/lib/candidate-collaboration";
import { candidateTrustHref } from "@/lib/candidate-trust";
import { jobOverviewHref, jobPipelineHref } from "@/lib/job-pipeline";
import type { TranslationKey } from "@/lib/i18n";
import { candidateTeamHref } from "@/lib/team-collaboration";
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

function noteCategoryKey(category: CandidateCollaborationRecord["notes"][number]["category"]): TranslationKey {
  const map: Record<CandidateCollaborationRecord["notes"][number]["category"], TranslationKey> = {
    general: "candidateCollaboration.noteCategoryGeneral",
    interview: "candidateCollaboration.noteCategoryInterview",
    reference: "candidateCollaboration.noteCategoryReference",
    internal: "candidateCollaboration.noteCategoryInternal",
  };
  return map[category];
}

function noteVisibilityKey(
  visibility: CandidateCollaborationRecord["notes"][number]["visibility"],
): TranslationKey {
  const map: Record<CandidateCollaborationRecord["notes"][number]["visibility"], TranslationKey> = {
    team: "candidateCollaboration.visibilityTeam",
    recruiter_only: "candidateCollaboration.visibilityRecruiterOnly",
    hiring_manager: "candidateCollaboration.visibilityHiringManager",
  };
  return map[visibility];
}

function recommendationKey(
  rec: CandidateCollaborationRecord["feedback"][number]["recommendation"],
): TranslationKey {
  const map: Record<CandidateCollaborationRecord["feedback"][number]["recommendation"], TranslationKey> = {
    continue: "candidateCollaboration.recContinue",
    hold: "candidateCollaboration.recHold",
    reject: "candidateCollaboration.recReject",
    needs_evidence: "candidateCollaboration.recNeedsEvidence",
  };
  return map[rec];
}

function criterionKey(id: ScorecardCriterionId): TranslationKey {
  const map: Record<ScorecardCriterionId, TranslationKey> = {
    technical_fit: "candidateCollaboration.criterionTechnicalFit",
    domain_fit: "candidateCollaboration.criterionDomainFit",
    communication: "candidateCollaboration.criterionCommunication",
    seniority: "candidateCollaboration.criterionSeniority",
    motivation: "candidateCollaboration.criterionMotivation",
    culture_team_fit: "candidateCollaboration.criterionCultureTeamFit",
    delivery_confidence: "candidateCollaboration.criterionDeliveryConfidence",
    risk_level: "candidateCollaboration.criterionRiskLevel",
    consent_trust_readiness: "candidateCollaboration.criterionConsentTrust",
  };
  return map[id];
}

function formTitleKey(id: CandidateCollaborationRecord["forms"][number]["id"]): TranslationKey {
  const map: Record<CandidateCollaborationRecord["forms"][number]["id"], TranslationKey> = {
    screening: "candidateCollaboration.formScreening",
    interview_feedback: "candidateCollaboration.formInterviewFeedback",
    hiring_manager_review: "candidateCollaboration.formHiringManagerReview",
  };
  return map[id];
}

function CollaborationNotFound({
  surface,
  kind,
}: {
  surface: CandidateCollaborationSurface;
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
      <div data-testid={CANDIDATE_COLLABORATION_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("candidateCollaboration.notFoundTitle")}
          message={t("candidateCollaboration.notFoundMessage")}
          steps={[
            t("candidateCollaboration.notFoundStep1"),
            t("candidateCollaboration.notFoundStep2"),
            t("candidateCollaboration.notFoundStep3"),
          ]}
          actionLabel={t("candidateCollaboration.notFoundCta")}
          actionHref={back}
        />
      </div>
    </Shell>
  );
}

function CollaborationContent({
  record,
  surface,
  view,
}: {
  record: CandidateCollaborationRecord;
  surface: CandidateCollaborationSurface;
  view: CollaborationView;
}) {
  const { t } = useTranslation();
  const isJobView = view === "job-feedback" || view === "job-scorecards";
  const profileHref = candidateProfile360Href(record.id, surface);
  const pipelineHref = jobPipelineHref(record.role_id, surface);
  const overviewHref = jobOverviewHref(record.role_id, surface);

  const showNotes = view === "collaboration" || view === "notes";
  const showFeedback = view === "collaboration" || view === "feedback" || view === "job-feedback";
  const showScorecard = view === "collaboration" || view === "scorecard" || view === "job-scorecards";
  const showForms = view === "collaboration";
  const showAudit = view === "collaboration" || view === "job-feedback" || view === "job-scorecards";

  return (
    <Shell wide rail>
      <div data-candidate-collaboration-page={CANDIDATE_COLLABORATION_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={CANDIDATE_COLLABORATION_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("candidateCollaboration.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">
                {isJobView ? record.role_title : record.display_name}
              </h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {isJobView ? t("candidateCollaboration.jobScopedLead") : record.headline}
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
                data-testid={CANDIDATE_COLLABORATION_MARKERS.pilotBadge}
              >
                {t("candidateCollaboration.pilotBadge")}
              </span>
              <Link
                href={candidateTrustHref(record.id, surface)}
                className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs text-[var(--twin-muted-strong)] twin-link"
                data-testid="candidate-collaboration-trust-link"
              >
                {t("candidateCollaboration.trustConsent")}: {record.trust_label}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href={profileHref} className="twin-link font-medium">
              {t("candidateCollaboration.openProfile360")}
            </Link>
            <Link href={pipelineHref} className="twin-link font-medium">
              {t("candidateCollaboration.openPipeline")}
            </Link>
            <Link href={overviewHref} className="twin-link font-medium">
              {t("candidateCollaboration.openJobOverview")}
            </Link>
            {!isJobView ? (
              <>
                <Link href={candidateFeedbackHref(record.id, surface)} className="twin-link font-medium">
                  {t("candidateCollaboration.focusFeedback")}
                </Link>
                <Link href={candidateScorecardHref(record.id, surface)} className="twin-link font-medium">
                  {t("candidateCollaboration.focusScorecard")}
                </Link>
              </>
            ) : (
              <>
                <Link href={jobFeedbackHref(record.role_id, surface)} className="twin-link font-medium">
                  {t("candidateCollaboration.jobFeedbackLink")}
                </Link>
                <Link href={jobScorecardsHref(record.role_id, surface)} className="twin-link font-medium">
                  {t("candidateCollaboration.jobScorecardsLink")}
                </Link>
              </>
            )}
          </div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {t("candidateCollaboration.humanDecisionRequired")}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {showNotes
            ? sectionCard(
                CANDIDATE_COLLABORATION_MARKERS.recruiterNotes,
                t("candidateCollaboration.recruiterNotesTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateCollaboration.notesDemoLead")}</p>
                  <ul className="space-y-3">
                    {record.notes.map((note) => (
                      <li
                        key={note.id}
                        className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                        data-testid={`candidate-collaboration-note-${note.id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold">{note.author}</span>
                          <span className="text-[var(--twin-muted-strong)]">{note.at.slice(0, 10)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                            {t(noteCategoryKey(note.category))}
                          </span>
                          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium uppercase">
                            {t(noteVisibilityKey(note.visibility))}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{note.body}</p>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled
                    className="mt-3 cursor-not-allowed rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] opacity-60"
                    title={t("candidateCollaboration.addNoteDisabledHint")}
                  >
                    {t("candidateCollaboration.addNoteCta")}
                  </button>
                </>,
              )
            : null}

          {showFeedback
            ? sectionCard(
                CANDIDATE_COLLABORATION_MARKERS.hiringFeedback,
                t("candidateCollaboration.hiringFeedbackTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateCollaboration.noFakeFinalDecisions")}</p>
                  <ul className="space-y-4">
                    {record.feedback.map((fb) => (
                      <li
                        key={fb.id}
                        className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                        data-testid={`candidate-collaboration-feedback-${fb.id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{fb.author_role}</span>
                          <span
                            className="rounded-full border border-[var(--twin-accent)]/40 bg-[var(--twin-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--twin-accent)]"
                          >
                            {t(recommendationKey(fb.recommendation))}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{fb.at.slice(0, 10)}</p>
                        <p className="mt-2 text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                          {t("candidateCollaboration.strengthsLabel")}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs">
                          {fb.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                          {t("candidateCollaboration.concernsLabel")}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs text-amber-200/90">
                          {fb.concerns.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                          {t("candidateCollaboration.missingEvidenceLabel")}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs">
                          {fb.missing_evidence.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </>,
              )
            : null}

          {showScorecard
            ? sectionCard(
                CANDIDATE_COLLABORATION_MARKERS.scorecard,
                t("candidateCollaboration.scorecardTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateCollaboration.scorecardLead")}</p>
                  <ul className="space-y-3">
                    {record.scorecard.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border border-[var(--twin-border)]/60 p-3"
                        data-testid={`candidate-collaboration-scorecard-${row.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{t(criterionKey(row.id))}</span>
                          <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs font-bold">
                            {row.rating}/5
                          </span>
                        </div>
                        <p className="mt-2 text-xs">
                          <span className="font-medium">{t("candidateCollaboration.evidenceLabel")}:</span>{" "}
                          {row.evidence}
                        </p>
                        <p className="mt-1 text-xs text-amber-200/90">
                          <span className="font-medium">{t("candidateCollaboration.missingInfoLabel")}:</span>{" "}
                          {row.missing_info}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>,
                "lg:col-span-2",
              )
            : null}

          {showForms
            ? sectionCard(
                CANDIDATE_COLLABORATION_MARKERS.formsPreview,
                t("candidateCollaboration.formsPreviewTitle"),
                <>
                  <span className="inline-block rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-xs font-medium">
                    {t("candidateCollaboration.formsPlannedBadge")}
                  </span>
                  <p className="twin-muted text-xs">{t("candidateCollaboration.formsPreviewLead")}</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {record.forms.map((form) => (
                      <div
                        key={form.id}
                        className="rounded-lg border border-[var(--twin-border)]/60 p-3 opacity-70"
                        data-testid={`candidate-collaboration-form-${form.id}`}
                      >
                        <p className="text-sm font-semibold">{t(formTitleKey(form.id))}</p>
                        <ul className="mt-2 space-y-1">
                          {form.fields.map((field) => (
                            <li key={field.label} className="text-xs text-[var(--twin-muted-strong)]">
                              {field.label}
                              <span className="ml-1 text-[10px] uppercase">({field.field_type})</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          disabled
                          className="mt-3 w-full cursor-not-allowed rounded border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-2 py-1 text-[10px] font-medium opacity-60"
                        >
                          {t("candidateCollaboration.formSubmitDisabled")}
                        </button>
                      </div>
                    ))}
                  </div>
                </>,
                "lg:col-span-2",
              )
            : null}

          {showAudit
            ? sectionCard(
                CANDIDATE_COLLABORATION_MARKERS.decisionMemory,
                t("candidateCollaboration.decisionMemoryTitle"),
                <>
                  <p className="twin-muted text-xs">{t("candidateCollaboration.decisionMemoryLead")}</p>
                  <ul className="space-y-2 border-l border-[var(--twin-border)] pl-4">
                    {record.audit_events.map((event) => (
                      <li key={`${event.action}-${event.at}`} className="text-xs">
                        <span className="font-semibold">{event.action}</span>
                        <span className="twin-muted">
                          {" "}
                          · {event.at.slice(0, 10)} · {event.actor}
                        </span>
                        <p className="twin-muted mt-0.5">{event.detail}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <Link href={candidateScorecardHref(record.id, surface)} className="twin-link font-medium">
                      {t("candidateCollaboration.auditToScorecard")}
                    </Link>
                    <Link href={candidateFeedbackHref(record.id, surface)} className="twin-link font-medium">
                      {t("candidateCollaboration.auditToFeedback")}
                    </Link>
                    <Link
                      href={candidateTeamHref(record.id, surface)}
                      className="twin-link font-medium"
                      data-testid="candidate-collaboration-team-link"
                    >
                      {t("teamCollaboration.openTeamWorkspace")}
                    </Link>
                    <Link
                      href={candidateCommunicationHref(record.id, surface)}
                      className="twin-link font-medium"
                      data-testid="candidate-collaboration-communication-link"
                    >
                      {t("safeCommunication.openCommunication")}
                    </Link>
                  </div>
                </>,
                showForms ? "" : "lg:col-span-2",
              )
            : null}
        </div>

        <Card
          variant="soft"
          className="border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/40 p-5"
          data-testid={CANDIDATE_COLLABORATION_MARKERS.boundary}
        >
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {t("candidateCollaboration.boundaryTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {t("candidateCollaboration.boundaryBody")}
          </p>
        </Card>
      </div>
    </Shell>
  );
}

type CandidateCollaborationWorkspaceProps = {
  candidateId: string;
  surface: CandidateCollaborationSurface;
  view?: CollaborationView;
};

export function CandidateCollaborationWorkspace({
  candidateId,
  surface,
  view = "collaboration",
}: CandidateCollaborationWorkspaceProps) {
  const record = useMemo(() => resolveCandidateCollaboration(candidateId), [candidateId]);

  if (!record) {
    return <CollaborationNotFound surface={surface} kind="candidate" />;
  }

  return <CollaborationContent record={record} surface={surface} view={view} />;
}

type JobCollaborationWorkspaceProps = {
  jobId: string;
  surface: CandidateCollaborationSurface;
  view: "job-feedback" | "job-scorecards";
};

export function JobCollaborationWorkspace({ jobId, surface, view }: JobCollaborationWorkspaceProps) {
  const record = useMemo(() => resolveJobCollaboration(jobId), [jobId]);

  if (!record) {
    return <CollaborationNotFound surface={surface} kind="job" />;
  }

  return <CollaborationContent record={record} surface={surface} view={view} />;
}
