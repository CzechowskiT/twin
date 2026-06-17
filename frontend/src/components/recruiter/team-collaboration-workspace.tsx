"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import {
  candidateCollaborationHref,
  candidateFeedbackHref,
  candidateNotesHref,
} from "@/lib/candidate-collaboration";
import { candidateTrustHref } from "@/lib/candidate-trust";
import type { TranslationKey } from "@/lib/i18n";
import { jobPipelineHref } from "@/lib/job-pipeline";
import type {
  AssignmentRole,
  CandidateTeamCollaborationRecord,
  JobTeamCollaborationRecord,
  TeamActivityEventType,
  TeamCollaborationStatus,
  TeamFollowUpTask,
} from "@/lib/team-collaboration-demo-data";
import {
  jobsListHref,
  jobTasksHref,
  jobTeamHref,
  resolveCandidateTeamCollaboration,
  resolveJobTeamCollaboration,
  TEAM_COLLABORATION_MARKERS,
  TEAM_COLLABORATION_PAGE_MARKER,
  type TeamCollaborationSurface,
  type TeamCollaborationView,
} from "@/lib/team-collaboration";
import { candidateCommunicationHref, jobCommunicationHref } from "@/lib/safe-communication";

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

function collaborationStatusKey(status: TeamCollaborationStatus): TranslationKey {
  const map: Record<TeamCollaborationStatus, TranslationKey> = {
    active: "teamCollaboration.statusActive",
    awaiting_feedback: "teamCollaboration.statusAwaitingFeedback",
    decision_pending: "teamCollaboration.statusDecisionPending",
  };
  return map[status];
}

function activityTypeKey(type: TeamActivityEventType): TranslationKey {
  const map: Record<TeamActivityEventType, TranslationKey> = {
    reviewed: "teamCollaboration.eventReviewed",
    feedback_requested: "teamCollaboration.eventFeedbackRequested",
    scorecard_drafted: "teamCollaboration.eventScorecardDrafted",
    consent_review: "teamCollaboration.eventConsentReview",
    shortlist: "teamCollaboration.eventShortlist",
    task_created: "teamCollaboration.eventTaskCreated",
    digest: "teamCollaboration.eventDigest",
    decision_pending: "teamCollaboration.eventDecisionPending",
  };
  return map[type];
}

function assignmentRoleKey(role: AssignmentRole): TranslationKey {
  const map: Record<AssignmentRole, TranslationKey> = {
    decision_owner: "teamCollaboration.roleDecisionOwner",
    reviewer: "teamCollaboration.roleReviewer",
    consent: "teamCollaboration.roleConsent",
    recruiter: "teamCollaboration.roleRecruiter",
    hiring_manager: "teamCollaboration.roleHiringManager",
    task_owner: "teamCollaboration.roleTaskOwner",
  };
  return map[role];
}

function taskPriorityKey(priority: TeamFollowUpTask["priority"]): TranslationKey {
  const map: Record<TeamFollowUpTask["priority"], TranslationKey> = {
    high: "teamCollaboration.priorityHigh",
    medium: "teamCollaboration.priorityMedium",
    low: "teamCollaboration.priorityLow",
  };
  return map[priority];
}

function taskStatusKey(status: TeamFollowUpTask["status"]): TranslationKey {
  const map: Record<TeamFollowUpTask["status"], TranslationKey> = {
    open: "teamCollaboration.taskOpen",
    in_progress: "teamCollaboration.taskInProgress",
    blocked: "teamCollaboration.taskBlocked",
  };
  return map[status];
}

function checklistKey(labelKey: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    profile: "teamCollaboration.checkProfile",
    consent: "teamCollaboration.checkConsent",
    scorecard: "teamCollaboration.checkScorecard",
    feedback: "teamCollaboration.checkFeedback",
    risks: "teamCollaboration.checkRisks",
    communication: "teamCollaboration.checkCommunication",
    human_decision: "teamCollaboration.checkHumanDecision",
  };
  return map[labelKey] ?? "teamCollaboration.checkProfile";
}

function checklistStatusKey(status: "complete" | "pending" | "blocked"): TranslationKey {
  const map: Record<"complete" | "pending" | "blocked", TranslationKey> = {
    complete: "teamCollaboration.checkStatusComplete",
    pending: "teamCollaboration.checkStatusPending",
    blocked: "teamCollaboration.checkStatusBlocked",
  };
  return map[status];
}

function TeamNotFound({
  surface,
  kind,
}: {
  surface: TeamCollaborationSurface;
  kind: "candidate" | "job";
}) {
  const { t } = useTranslation();
  const back = jobsListHref(surface);

  return (
    <Shell wide rail>
      <div data-testid={TEAM_COLLABORATION_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("teamCollaboration.notFoundTitle")}
          message={t("teamCollaboration.notFoundMessage")}
          steps={[
            t("teamCollaboration.notFoundStep1"),
            t("teamCollaboration.notFoundStep2"),
            t("teamCollaboration.notFoundStep3"),
          ]}
          actionLabel={t("teamCollaboration.notFoundCta")}
          actionHref={kind === "candidate" ? candidateProfile360Href("demo-candidate-001", surface) : back}
        />
      </div>
    </Shell>
  );
}

type SharedContentProps = {
  surface: TeamCollaborationSurface;
  view: TeamCollaborationView;
  header: ReactNode;
  record: CandidateTeamCollaborationRecord | JobTeamCollaborationRecord;
  candidateId?: string;
  jobId?: string;
};

function TeamContent({ surface, view, header, record, candidateId, jobId }: SharedContentProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (view === "tasks") {
      document.getElementById("team-follow-up-tasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [view]);

  const profileHref = candidateId
    ? candidateProfile360Href(candidateId, surface)
    : candidateProfile360Href("demo-candidate-001", surface);
  const pipelineHref = jobId
    ? jobPipelineHref(jobId, surface)
    : jobPipelineHref("demo-role-001", surface);
  const notesHref = candidateId
    ? candidateNotesHref(candidateId, surface)
    : candidateNotesHref("demo-candidate-001", surface);
  const collaborationHref = candidateId
    ? candidateCollaborationHref(candidateId, surface)
    : candidateCollaborationHref("demo-candidate-001", surface);
  const feedbackHref = candidateId
    ? candidateFeedbackHref(candidateId, surface)
    : candidateFeedbackHref("demo-candidate-001", surface);
  const trustHref = candidateId
    ? candidateTrustHref(candidateId, surface)
    : candidateTrustHref("demo-candidate-001", surface);
  const digestHref = "/recruiter/talent-radar/digest";
  const teamHref = jobId ? jobTeamHref(jobId, surface) : candidateId ? undefined : undefined;
  const tasksHref = jobId ? jobTasksHref(jobId, surface) : undefined;
  const communicationHref = candidateId
    ? candidateCommunicationHref(candidateId, surface)
    : jobId
      ? jobCommunicationHref(jobId, surface)
      : candidateCommunicationHref("demo-candidate-001", surface);

  return (
    <Shell wide rail>
      <div
        data-team-collaboration-page={TEAM_COLLABORATION_PAGE_MARKER}
        className="space-y-6"
      >
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        {header}

        <div className="grid gap-4 lg:grid-cols-2">
          {sectionCard(
            TEAM_COLLABORATION_MARKERS.activityTimeline,
            t("teamCollaboration.activityTitle"),
            <>
              <p className="twin-muted text-xs">{t("teamCollaboration.activityLead")}</p>
              <ul className="space-y-2">
                {record.activity_events.map((event) => (
                  <li
                    key={`${event.type}-${event.at}`}
                    className="flex gap-3 rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
                  >
                    <span className="shrink-0 rounded bg-[var(--twin-surface-soft)] px-2 py-0.5 font-medium">
                      {t(activityTypeKey(event.type))}
                    </span>
                    <span>
                      {event.at.slice(0, 10)} — {event.actor}: {event.summary}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            TEAM_COLLABORATION_MARKERS.assignments,
            t("teamCollaboration.assignmentsTitle"),
            <>
              <p className="twin-muted text-xs">{t("teamCollaboration.assignmentsLead")}</p>
              <ul className="space-y-2">
                {record.assignments.map((assignment) => (
                  <li
                    key={assignment.role}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold">{t(assignmentRoleKey(assignment.role))}</span>
                    <span>{assignment.owner_label}</span>
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium opacity-60"
                      title={t("teamCollaboration.reassignDisabledHint")}
                    >
                      {t("teamCollaboration.reassignCta")}
                    </button>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            TEAM_COLLABORATION_MARKERS.followUpTasks,
            t("teamCollaboration.tasksTitle"),
            <>
              <p className="twin-muted text-xs">{t("teamCollaboration.tasksLead")}</p>
              <ul id="team-follow-up-tasks" className="space-y-3">
                {record.follow_up_tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
                  >
                    <p className="font-semibold">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[var(--twin-muted-strong)]">
                      <span>{t(taskPriorityKey(task.priority))}</span>
                      <span>·</span>
                      <span>{t("teamCollaboration.dueLabel")}: {task.due}</span>
                      <span>·</span>
                      <span>{task.owner_label}</span>
                      <span>·</span>
                      <span>{t(taskStatusKey(task.status))}</span>
                    </div>
                    <p className="mt-1 text-[var(--twin-muted-strong)]">
                      {t("teamCollaboration.linkedSurface")}: {task.linked_surface}
                      {task.linked_surface.includes("communication") ? (
                        <>
                          {" · "}
                          <Link
                            href={communicationHref}
                            className="twin-link font-medium"
                            data-testid="team-collaboration-communication-task-link"
                          >
                            {t("safeCommunication.openCommunication")}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-2 cursor-not-allowed rounded border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium opacity-60"
                      title={t("teamCollaboration.taskActionDisabledHint")}
                    >
                      {t("teamCollaboration.taskActionCta")}
                    </button>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            TEAM_COLLABORATION_MARKERS.openQuestions,
            t("teamCollaboration.openQuestionsTitle"),
            <ul className="space-y-3">
              {record.open_questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-amber-200">{q.question}</p>
                  <p className="mt-1">{t("teamCollaboration.missingEvidence")}: {q.missing_evidence}</p>
                  <p className="twin-muted mt-1">{q.owner_label}</p>
                </li>
              ))}
            </ul>,
          )}

          {sectionCard(
            TEAM_COLLABORATION_MARKERS.decisionChecklist,
            t("teamCollaboration.checklistTitle"),
            <>
              <p className="twin-muted text-xs">{t("teamCollaboration.checklistLead")}</p>
              <ul className="space-y-2">
                {record.decision_checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{t(checklistKey(item.label_key))}</span>
                    <span className="text-[var(--twin-muted-strong)]">{t(checklistStatusKey(item.status))}</span>
                    {item.note ? <span className="w-full text-amber-200/90">{item.note}</span> : null}
                  </li>
                ))}
              </ul>
            </>,
          )}
        </div>

        {sectionCard(
          TEAM_COLLABORATION_MARKERS.boundary,
          t("teamCollaboration.boundaryTitle"),
          <p>{t("teamCollaboration.boundaryBody")}</p>,
        )}

        {sectionCard(
          TEAM_COLLABORATION_MARKERS.auditConnections,
          t("teamCollaboration.auditTitle"),
          <>
            <p className="twin-muted text-xs">{t("teamCollaboration.auditLead")}</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={profileHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-profile-360-link"
                >
                  {t("teamCollaboration.auditProfile360")}
                </Link>
              </li>
              <li>
                <Link
                  href={notesHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-notes-link"
                >
                  {t("teamCollaboration.auditNotes")}
                </Link>
              </li>
              <li>
                <Link
                  href={collaborationHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-collaboration-link"
                >
                  {t("teamCollaboration.auditCollaboration")}
                </Link>
              </li>
              <li>
                <Link
                  href={feedbackHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-feedback-link"
                >
                  {t("teamCollaboration.auditFeedback")}
                </Link>
              </li>
              <li>
                <Link
                  href={trustHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-trust-link"
                >
                  {t("teamCollaboration.auditTrust")}
                </Link>
              </li>
              <li>
                <Link
                  href={pipelineHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-pipeline-link"
                >
                  {t("teamCollaboration.auditPipeline")}
                </Link>
              </li>
              <li>
                <Link href={digestHref} className="twin-link font-medium" data-testid="team-collaboration-digest-link">
                  {t("teamCollaboration.auditDigest")}
                </Link>
              </li>
              {teamHref ? (
                <li>
                  <Link href={teamHref} className="twin-link font-medium" data-testid="team-collaboration-team-link">
                    {t("teamCollaboration.auditDecisionMemory")}
                  </Link>
                </li>
              ) : null}
              {tasksHref ? (
                <li>
                  <Link href={tasksHref} className="twin-link font-medium" data-testid="team-collaboration-tasks-link">
                    {t("teamCollaboration.auditTasks")}
                  </Link>
                </li>
              ) : null}
              <li>
                <Link
                  href={communicationHref}
                  className="twin-link font-medium"
                  data-testid="team-collaboration-communication-link"
                >
                  {t("safeCommunication.openCommunication")}
                </Link>
              </li>
            </ul>
          </>,
        )}
      </div>
    </Shell>
  );
}

function CandidateHeader({
  record,
  surface,
}: {
  record: CandidateTeamCollaborationRecord;
  surface: TeamCollaborationSurface;
}) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={TEAM_COLLABORATION_MARKERS.header}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("teamCollaboration.pageEyebrow")}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{record.display_name}</h1>
          <p className="twin-muted mt-1 text-sm">
            {record.role_title} · {record.role_id}
          </p>
        </div>
        <span
          className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200"
          data-testid={TEAM_COLLABORATION_MARKERS.pilotBadge}
        >
          {t("teamCollaboration.pilotBadge")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("teamCollaboration.pipelineStage")}: {record.pipeline_stage}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("teamCollaboration.collaborationStatus")}: {t(collaborationStatusKey(record.collaboration_status))}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("teamCollaboration.decisionOwner")}: {record.decision_owner}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-amber-200">{t("teamCollaboration.humanDecisionRequired")}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={candidateProfile360Href(record.id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openProfile360")}
        </Link>
        <Link href={jobPipelineHref(record.role_id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openPipeline")}
        </Link>
        <Link href={candidateNotesHref(record.id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openNotes")}
        </Link>
        <Link href={candidateTrustHref(record.id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openTrust")}
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
  record: JobTeamCollaborationRecord;
  surface: TeamCollaborationSurface;
  view: TeamCollaborationView;
}) {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={TEAM_COLLABORATION_MARKERS.header}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("teamCollaboration.pageEyebrow")}
            {view === "tasks" ? ` · ${t("teamCollaboration.tasksFocus")}` : ""}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{record.title}</h1>
          <p className="twin-muted mt-1 text-sm">
            {record.department} · {record.role_id}
          </p>
        </div>
        <span
          className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200"
          data-testid={TEAM_COLLABORATION_MARKERS.pilotBadge}
        >
          {t("teamCollaboration.pilotBadge")}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("teamCollaboration.collaborationStatus")}: {t(collaborationStatusKey(record.collaboration_status))}
        </span>
        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5">
          {t("teamCollaboration.decisionOwner")}: {record.decision_owner}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-amber-200">{t("teamCollaboration.humanDecisionRequired")}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={jobPipelineHref(record.role_id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openPipeline")}
        </Link>
        <Link href={jobTeamHref(record.role_id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openTeam")}
        </Link>
        <Link href={jobTasksHref(record.role_id, surface)} className="twin-link font-medium">
          {t("teamCollaboration.openTasks")}
        </Link>
      </div>
    </Card>
  );
}

export function CandidateTeamCollaborationWorkspace({
  candidateId,
  surface,
  view = "team",
}: {
  candidateId: string;
  surface: TeamCollaborationSurface;
  view?: TeamCollaborationView;
}) {
  const record = useMemo(() => resolveCandidateTeamCollaboration(candidateId), [candidateId]);

  if (!record) {
    return <TeamNotFound surface={surface} kind="candidate" />;
  }

  return (
    <TeamContent
      surface={surface}
      view={view}
      record={record}
      candidateId={candidateId}
      header={<CandidateHeader record={record} surface={surface} />}
    />
  );
}

export function JobTeamCollaborationWorkspace({
  jobId,
  surface,
  view = "team",
}: {
  jobId: string;
  surface: TeamCollaborationSurface;
  view?: TeamCollaborationView;
}) {
  const record = useMemo(() => resolveJobTeamCollaboration(jobId), [jobId]);

  if (!record) {
    return <TeamNotFound surface={surface} kind="job" />;
  }

  return (
    <TeamContent
      surface={surface}
      view={view}
      record={record}
      jobId={jobId}
      header={<JobHeader record={record} surface={surface} view={view} />}
    />
  );
}
