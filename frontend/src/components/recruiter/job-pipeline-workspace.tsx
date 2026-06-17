"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  candidateProfile360Href,
  isCandidateProfile360DemoId,
} from "@/lib/candidate-profile-360";
import type { TranslationKey } from "@/lib/i18n";
import {
  candidatesForStage,
  JOB_PIPELINE_STAGE_ORDER,
  type JobPipelineCandidate,
  type JobPipelineHealth,
  type JobPipelineRecord,
  type JobPipelineStageId,
} from "@/lib/job-pipeline-demo-data";
import {
  JOB_PIPELINE_MARKERS,
  JOB_PIPELINE_PAGE_MARKER,
  jobOverviewHref,
  jobPipelineHref,
  jobsListHref,
  type JobPipelineSurface,
  resolveJobPipeline,
  stageColumnTestId,
} from "@/lib/job-pipeline";

const STAGE_ACCENT: Record<JobPipelineStageId, string> = {
  new: "border-sky-500/50 bg-sky-500/5",
  review: "border-violet-500/50 bg-violet-500/5",
  shortlist: "border-emerald-500/50 bg-emerald-500/5",
  interview: "border-amber-500/50 bg-amber-500/5",
  offer: "border-teal-500/50 bg-teal-500/5",
  rejected: "border-rose-500/50 bg-rose-500/5",
  nurture: "border-indigo-500/50 bg-indigo-500/5",
};

function stageTitleKey(stage: JobPipelineStageId): TranslationKey {
  const map: Record<JobPipelineStageId, TranslationKey> = {
    new: "jobPipeline.stageNew",
    review: "jobPipeline.stageReview",
    shortlist: "jobPipeline.stageShortlist",
    interview: "jobPipeline.stageInterview",
    offer: "jobPipeline.stageOffer",
    rejected: "jobPipeline.stageRejected",
    nurture: "jobPipeline.stageNurture",
  };
  return map[stage];
}

function fitLabelKey(fit: JobPipelineCandidate["fit_label"]): TranslationKey {
  const map: Record<JobPipelineCandidate["fit_label"], TranslationKey> = {
    strong: "jobPipeline.fitStrong",
    good: "jobPipeline.fitGood",
    possible: "jobPipeline.fitPossible",
    weak: "jobPipeline.fitWeak",
  };
  return map[fit];
}

function healthKey(health: JobPipelineHealth): TranslationKey {
  const map: Record<JobPipelineHealth, TranslationKey> = {
    healthy: "jobPipeline.healthHealthy",
    attention: "jobPipeline.healthAttention",
    stalled: "jobPipeline.healthStalled",
  };
  return map[health];
}

function priorityKey(priority: JobPipelineRecord["priority"]): TranslationKey {
  const map: Record<JobPipelineRecord["priority"], TranslationKey> = {
    high: "jobPipeline.priorityHigh",
    medium: "jobPipeline.priorityMedium",
    low: "jobPipeline.priorityLow",
  };
  return map[priority];
}

function decisionEventKey(
  action: JobPipelineRecord["decision_events"][number]["action"],
): TranslationKey {
  const map: Record<
    JobPipelineRecord["decision_events"][number]["action"],
    TranslationKey
  > = {
    matched: "jobPipeline.eventMatched",
    moved_to_review: "jobPipeline.eventMovedToReview",
    shortlisted: "jobPipeline.eventShortlisted",
    interview_scheduled: "jobPipeline.eventInterviewScheduled",
    offer_drafted: "jobPipeline.eventOfferDrafted",
    rejected: "jobPipeline.eventRejected",
    nurtured: "jobPipeline.eventNurtured",
  };
  return map[action];
}

function PipelineNotFound({ surface }: { surface: JobPipelineSurface }) {
  const { t } = useTranslation();
  const back = jobsListHref(surface);

  return (
    <Shell wide rail>
      <div data-testid={JOB_PIPELINE_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("jobPipeline.notFoundTitle")}
          message={t("jobPipeline.notFoundMessage")}
          steps={[
            t("jobPipeline.notFoundStep1"),
            t("jobPipeline.notFoundStep2"),
            t("jobPipeline.notFoundStep3"),
          ]}
          actionLabel={t("jobPipeline.notFoundCta")}
          actionHref={back}
        />
      </div>
    </Shell>
  );
}

function CandidateCard({
  candidate,
  surface,
}: {
  candidate: JobPipelineCandidate;
  surface: JobPipelineSurface;
}) {
  const { t } = useTranslation();
  const lastActivity = candidate.last_activity.slice(0, 10);
  const profileHref = candidateProfile360Href(candidate.profile_link.candidate_id, surface);
  const profileConnected =
    candidate.profile_link.profile_360_connected &&
    isCandidateProfile360DemoId(candidate.profile_link.candidate_id);

  return (
    <article
      className="rounded-lg border border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/80 p-3 shadow-sm"
      data-testid={JOB_PIPELINE_MARKERS.candidateCard}
      data-candidate-id={candidate.id}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{candidate.display_name}</h3>
        <span className="shrink-0 rounded-full border border-[var(--twin-accent)]/40 bg-[var(--twin-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--twin-accent)]">
          {candidate.match_score}%
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{t(fitLabelKey(candidate.fit_label))}</p>
      <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">
        {t("jobPipeline.trustConsent")}: {candidate.trust_label}
      </p>
      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
        {t("jobPipeline.lastActivity")}: {lastActivity}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]">{candidate.rationale}</p>
      {profileConnected ? (
        <Link
          href={profileHref}
          className="twin-link mt-3 inline-block text-xs font-medium"
          data-testid={`job-pipeline-profile-360-link-${candidate.id}`}
        >
          {t("jobPipeline.viewProfile360")}
        </Link>
      ) : (
        <p className="mt-3 text-xs text-[var(--twin-muted-strong)]">{t("jobPipeline.profileNotConnected")}</p>
      )}
    </article>
  );
}

function StageColumn({
  stage,
  candidates,
  surface,
}: {
  stage: JobPipelineStageId;
  candidates: JobPipelineCandidate[];
  surface: JobPipelineSurface;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex min-w-[220px] flex-1 flex-col rounded-xl border-2 p-3 ${STAGE_ACCENT[stage]}`}
      data-testid={stageColumnTestId(stage)}
      data-job-pipeline-column={JOB_PIPELINE_MARKERS.column}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--foreground)]">
          {t(stageTitleKey(stage))}
        </h3>
        <span className="rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs font-semibold">
          {candidates.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {candidates.length === 0 ? (
          <p className="twin-muted py-4 text-center text-xs">{t("jobPipeline.columnEmpty")}</p>
        ) : (
          candidates.map((c) => <CandidateCard key={c.id} candidate={c} surface={surface} />)
        )}
      </div>
    </div>
  );
}

function PipelineContent({
  record,
  surface,
  showOverviewOnly = false,
}: {
  record: JobPipelineRecord;
  surface: JobPipelineSurface;
  showOverviewOnly?: boolean;
}) {
  const { t } = useTranslation();
  const stagesByColumn = useMemo(
    () =>
      JOB_PIPELINE_STAGE_ORDER.map((stage) => ({
        stage,
        candidates: candidatesForStage(record, stage),
      })),
    [record],
  );

  return (
    <Shell wide rail>
      <div data-job-pipeline-page={JOB_PIPELINE_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={JOB_PIPELINE_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("jobPipeline.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{record.title}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">
                {record.department} · {record.location}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200"
                data-testid={JOB_PIPELINE_MARKERS.pilotBadge}
              >
                {t("jobPipeline.pilotBadge")}
              </span>
              <span className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs font-medium">
                {t(priorityKey(record.priority))}
              </span>
              <span className="rounded-full border border-[var(--twin-border)] px-2.5 py-0.5 text-xs text-[var(--twin-muted-strong)]">
                {record.seniority}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--twin-muted-strong)]">
            <span>
              {t("jobPipeline.pipelineHealth")}: {t(healthKey(record.pipeline_health))}
            </span>
            <span>
              {t("jobPipeline.candidateCount")}: {record.candidate_count}
            </span>
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {t("jobPipeline.humanDecisionRequired")}
            </span>
          </div>
          <Link href={jobsListHref(surface)} className="twin-link text-sm font-medium">
            {t("jobPipeline.backToJobs")}
          </Link>
          {!showOverviewOnly ? (
            <Link href={jobOverviewHref(record.id, surface)} className="twin-link ml-4 text-sm font-medium">
              {t("jobPipeline.viewJobOverview")}
            </Link>
          ) : (
            <Link href={jobPipelineHref(record.id, surface)} className="twin-link ml-4 text-sm font-medium">
              {t("jobPipeline.openPipeline")}
            </Link>
          )}
        </header>

        {showOverviewOnly ? (
          <Card
            variant="soft"
            className="border-[var(--twin-border)]/80 p-5 sm:p-6"
            data-testid={JOB_PIPELINE_MARKERS.jobOverview}
          >
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("jobPipeline.overviewLead")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={jobPipelineHref(record.id, surface)} className="twin-btn-solid twin-touch-target text-sm">
                {t("jobPipeline.openPipeline")}
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {stagesByColumn.map(({ stage, candidates }) => (
                <div
                  key={stage}
                  className="rounded-lg border border-[var(--twin-border)]/60 p-3 text-center"
                >
                  <p className="text-xs font-semibold uppercase text-[var(--twin-muted-strong)]">
                    {t(stageTitleKey(stage))}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{candidates.length}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <>
            <section data-testid={JOB_PIPELINE_MARKERS.board} className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3">
                {stagesByColumn.map(({ stage, candidates }) => (
                  <StageColumn key={stage} stage={stage} candidates={candidates} surface={surface} />
                ))}
              </div>
            </section>

            <Card
              variant="soft"
              className="border-[var(--twin-border)]/80 p-5 sm:p-6"
              data-testid={JOB_PIPELINE_MARKERS.stageActions}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("jobPipeline.stageActionsTitle")}
              </h2>
              <p className="twin-muted mt-2 text-xs">{t("jobPipeline.stageActionsLead")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    "jobPipeline.actionMoveToReview",
                    "jobPipeline.actionShortlist",
                    "jobPipeline.actionSnooze",
                    "jobPipeline.actionDismiss",
                    "jobPipeline.actionRequestFeedback",
                  ] as const
                ).map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--twin-muted-strong)] opacity-60"
                    title={t("jobPipeline.actionDisabledHint")}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </Card>

            <Card
              variant="soft"
              className="border-[var(--twin-border)]/80 p-5 sm:p-6"
              data-testid={JOB_PIPELINE_MARKERS.decisionMemory}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("jobPipeline.decisionMemoryTitle")}
              </h2>
              <p className="twin-muted mt-2 text-xs">{t("jobPipeline.decisionMemoryLead")}</p>
              <ul className="mt-4 space-y-3">
                {record.decision_events.map((event) => (
                  <li
                    key={`${event.action}-${event.at}-${event.candidate_id}`}
                    className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--foreground)]">
                        {t(decisionEventKey(event.action))}
                      </span>
                      <span className="text-[var(--twin-muted-strong)]">{event.at.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 text-[var(--twin-muted-strong)]">
                      {event.actor} · {event.candidate_id}
                    </p>
                    {event.note ? <p className="mt-1 text-[var(--foreground)]">{event.note}</p> : null}
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              variant="soft"
              className="border-amber-500/30 bg-amber-500/5 p-5 sm:p-6"
              data-testid={JOB_PIPELINE_MARKERS.boundary}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                {t("jobPipeline.boundaryTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                {t("jobPipeline.boundaryBody")}
              </p>
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}

type JobPipelineWorkspaceProps = {
  jobId: string;
  surface: JobPipelineSurface;
  mode?: "pipeline" | "overview";
};

export function JobPipelineWorkspace({
  jobId,
  surface,
  mode = "pipeline",
}: JobPipelineWorkspaceProps) {
  const record = useMemo(() => resolveJobPipeline(jobId), [jobId]);

  if (!record) {
    return <PipelineNotFound surface={surface} />;
  }

  return (
    <PipelineContent
      record={record}
      surface={surface}
      showOverviewOnly={mode === "overview"}
    />
  );
}
