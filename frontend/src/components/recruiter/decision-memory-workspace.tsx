"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { atsImportReadinessHref } from "@/lib/ats-import-readiness";
import { candidateCollaborationHref } from "@/lib/candidate-collaboration";
import { candidateProfile360Href } from "@/lib/candidate-profile-360";
import { candidateTrustHref } from "@/lib/candidate-trust";
import type {
  DecisionBlocker,
  DecisionMemoryRecord,
  DecisionMemoryState,
  DecisionTimelineEventType,
  EvidenceBundleStatus,
} from "@/lib/decision-memory-demo-data";
import {
  DECISION_MEMORY_MARKERS,
  DECISION_MEMORY_PAGE_MARKER,
  type DecisionMemorySurface,
  resolveDecisionMemory,
} from "@/lib/decision-memory";
import { jobPipelineHref } from "@/lib/job-pipeline";
import type { TranslationKey } from "@/lib/i18n";
import { candidateCommunicationHref } from "@/lib/safe-communication";
import { candidateTeamHref } from "@/lib/team-collaboration";
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

function stateKey(state: DecisionMemoryState): TranslationKey {
  const map: Record<DecisionMemoryState, TranslationKey> = {
    new: "decisionMemory.stateNew",
    under_review: "decisionMemory.stateUnderReview",
    shortlisted: "decisionMemory.stateShortlisted",
    hold: "decisionMemory.stateHold",
    rejected: "decisionMemory.stateRejected",
    nurture: "decisionMemory.stateNurture",
    offer_pending: "decisionMemory.stateOfferPending",
    decision_pending: "decisionMemory.stateDecisionPending",
  };
  return map[state];
}

function eventTypeKey(type: DecisionTimelineEventType): TranslationKey {
  const map: Record<DecisionTimelineEventType, TranslationKey> = {
    import: "decisionMemory.eventImport",
    ats_mapping: "decisionMemory.eventAtsMapping",
    consent: "decisionMemory.eventConsent",
    match: "decisionMemory.eventMatch",
    talent_radar: "decisionMemory.eventTalentRadar",
    profile_viewed: "decisionMemory.eventProfileViewed",
    scorecard_drafted: "decisionMemory.eventScorecardDrafted",
    hm_feedback: "decisionMemory.eventHmFeedback",
    shortlisted: "decisionMemory.eventShortlisted",
    comm_draft: "decisionMemory.eventCommDraft",
    decision_pending: "decisionMemory.eventDecisionPending",
  };
  return map[type];
}

function evidenceStatusKey(status: EvidenceBundleStatus): TranslationKey {
  const map: Record<EvidenceBundleStatus, TranslationKey> = {
    reviewed: "decisionMemory.evidenceReviewed",
    pending: "decisionMemory.evidencePending",
    requires_review: "decisionMemory.evidenceRequiresReview",
    blocked: "decisionMemory.evidenceBlocked",
  };
  return map[status];
}

function blockerSeverityKey(severity: DecisionBlocker["severity"]): TranslationKey {
  const map: Record<DecisionBlocker["severity"], TranslationKey> = {
    low: "decisionMemory.severityLow",
    medium: "decisionMemory.severityMedium",
    high: "decisionMemory.severityHigh",
  };
  return map[severity];
}

function DecisionMemoryNotFound({ surface }: { surface: DecisionMemorySurface }) {
  const { t } = useTranslation();
  const back = surface === "company" ? "/company/talent-pool" : "/recruiter/talent-radar";

  return (
    <Shell wide rail>
      <div data-testid={DECISION_MEMORY_MARKERS.notFound} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}
        <GuidedEmptyState
          title={t("decisionMemory.notFoundTitle")}
          message={t("decisionMemory.notFoundMessage")}
          steps={[
            t("decisionMemory.notFoundStep1"),
            t("decisionMemory.notFoundStep2"),
            t("decisionMemory.notFoundStep3"),
          ]}
          actionLabel={t("decisionMemory.notFoundCta")}
          actionHref={back}
        />
      </div>
    </Shell>
  );
}

function DecisionMemoryContent({
  record,
  surface,
}: {
  record: DecisionMemoryRecord;
  surface: DecisionMemorySurface;
}) {
  const { t } = useTranslation();
  const profileHref = candidateProfile360Href(record.id, surface);
  const pipelineHref = jobPipelineHref(record.role_id, surface);
  const collaborationHref = candidateCollaborationHref(record.id, surface);
  const trustHref = candidateTrustHref(record.id, surface);
  const teamHref = candidateTeamHref(record.id, surface);
  const communicationHref = candidateCommunicationHref(record.id, surface);
  const atsHref = atsImportReadinessHref(surface);

  return (
    <Shell wide rail>
      <div data-decision-memory-page={DECISION_MEMORY_PAGE_MARKER} className="space-y-6">
        {surface === "company" ? <CompanyWorkspaceNav /> : <RecruiterWorkspaceNav />}

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={DECISION_MEMORY_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("decisionMemory.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{record.display_name}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {record.role_title} · {record.pipeline_stage}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DemoJourneyPilotStatus testId={DECISION_MEMORY_MARKERS.pilotBadge} />
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                {t("decisionMemory.decisionStatusBadge")}: {record.decision_status}
              </span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("decisionMemory.owner")}: {record.owner}
              </span>
              <span className="text-[10px] text-[var(--twin-muted-strong)]">
                {t("decisionMemory.lastEvent")}: {record.last_event_at.slice(0, 10)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <Link href={profileHref} className="twin-link font-medium" data-testid="decision-memory-profile-link">
              {t("decisionMemory.openProfile360")}
            </Link>
            <Link href={pipelineHref} className="twin-link font-medium" data-testid="decision-memory-pipeline-link">
              {t("decisionMemory.openPipeline")}
            </Link>
            <Link
              href={collaborationHref}
              className="twin-link font-medium"
              data-testid="decision-memory-notes-link"
            >
              {t("decisionMemory.openNotes")}
            </Link>
            <Link href={trustHref} className="twin-link font-medium" data-testid="decision-memory-trust-link">
              {t("decisionMemory.openTrust")}
            </Link>
            <Link href={teamHref} className="twin-link font-medium" data-testid="decision-memory-team-link">
              {t("decisionMemory.openTeam")}
            </Link>
            <Link
              href={communicationHref}
              className="twin-link font-medium"
              data-testid="decision-memory-communication-link"
            >
              {t("decisionMemory.openCommunication")}
            </Link>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {sectionCard(
            DECISION_MEMORY_MARKERS.timeline,
            t("decisionMemory.timelineTitle"),
            <>
              <p className="twin-muted text-xs">{t("decisionMemory.timelineLead")}</p>
              <ul className="space-y-3 border-l border-[var(--twin-border)] pl-4">
                {record.timeline.map((event) => (
                  <li key={event.id} className="text-xs">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{t(eventTypeKey(event.type))}</span>
                      <span className="twin-muted">{event.at.slice(0, 10)}</span>
                      <span className="twin-muted">· {event.actor}</span>
                    </div>
                    <p className="twin-muted mt-0.5">
                      {t("decisionMemory.sourceModule")}: {event.source_module}
                    </p>
                    <Link href={event.evidence_href} className="twin-link mt-0.5 inline-block text-xs">
                      {t("decisionMemory.evidenceLink")}
                    </Link>
                    <p className="mt-1 text-[var(--foreground)]">{event.audit_note}</p>
                  </li>
                ))}
              </ul>
            </>,
            "lg:col-span-2",
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.evidence,
            t("decisionMemory.evidenceTitle"),
            <>
              <p className="twin-muted text-xs">{t("decisionMemory.evidenceLead")}</p>
              <ul className="space-y-3">
                {record.evidence_bundle.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface-soft)]/40 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{item.category}</span>
                      <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] font-medium">
                        {t(evidenceStatusKey(item.status))}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{item.summary}</p>
                    <Link href={item.source_href} className="twin-link mt-1 inline-block text-xs">
                      {t("decisionMemory.sourceLink")}
                    </Link>
                    {item.missing_evidence.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {t("decisionMemory.missingEvidence")}: {item.missing_evidence.join("; ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.decisionState,
            t("decisionMemory.decisionStateTitle"),
            <>
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm font-medium text-emerald-200">
                {record.decision_state_label}
              </p>
              <p className="font-medium">{t(stateKey(record.decision_state))}</p>
              <p className="twin-muted text-xs">{t("decisionMemory.decisionStateLead")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    "new",
                    "under_review",
                    "shortlisted",
                    "hold",
                    "rejected",
                    "nurture",
                    "offer_pending",
                    "decision_pending",
                  ] as DecisionMemoryState[]
                ).map((s) => (
                  <span
                    key={s}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      s === record.decision_state
                        ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-200"
                        : "border-[var(--twin-border)] text-[var(--twin-muted-strong)]"
                    }`}
                  >
                    {t(stateKey(s))}
                  </span>
                ))}
              </div>
            </>,
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.blockers,
            t("decisionMemory.blockersTitle"),
            <>
              <p className="twin-muted text-xs">{t("decisionMemory.blockersLead")}</p>
              <ul className="space-y-2">
                {record.blockers.map((blocker) => (
                  <li
                    key={blocker.id}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{blocker.label}</span>
                      <span className="rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px]">
                        {t(blockerSeverityKey(blocker.severity))}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{blocker.detail}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.nextActions,
            t("decisionMemory.nextActionsTitle"),
            <>
              <p className="twin-muted text-xs">{t("decisionMemory.nextActionsLead")}</p>
              <ul className="space-y-2">
                {record.next_actions.map((action) => (
                  <li key={action.id} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={action.completed}
                      disabled
                      readOnly
                      className="mt-0.5"
                      aria-label={action.label}
                    />
                    <span className={action.not_live ? "twin-muted" : ""}>
                      {action.label}
                      {action.not_live ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({t("decisionMemory.notLive")})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.auditIntegrity,
            t("decisionMemory.auditIntegrityTitle"),
            <>
              <p className="twin-muted text-xs">{t("decisionMemory.auditIntegrityLead")}</p>
              <ul className="space-y-1 text-xs">
                <li>· {t("decisionMemory.auditNoBackendWrites")}</li>
                <li>· {t("decisionMemory.auditDeterministic")}</li>
                <li>· {t("decisionMemory.auditNoSync")}</li>
                <li>· {t("decisionMemory.auditNoWriteback")}</li>
                <li>· {t("decisionMemory.auditNoEmails")}</li>
                <li>· {t("decisionMemory.auditHumanApproval")}</li>
                <li>· {t("decisionMemory.auditPilot")}</li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <Link href={atsHref} className="twin-link font-medium" data-testid="decision-memory-ats-link">
                  {t("decisionMemory.openAtsReadiness")}
                </Link>
                <Link href="/demo" className="twin-link font-medium" data-testid="decision-memory-demo-link">
                  {t("decisionMemory.openDemo")}
                </Link>
              </div>
            </>,
          )}

          {sectionCard(
            DECISION_MEMORY_MARKERS.humanBoundary,
            t("decisionMemory.humanBoundaryTitle"),
            <>
              <p className="text-sm leading-relaxed">{t("decisionMemory.humanBoundaryBody")}</p>
              <p className="twin-muted mt-2 text-xs">{t("decisionMemory.humanBoundaryNote")}</p>
            </>,
            "lg:col-span-2",
          )}
        </div>
      </div>
    </Shell>
  );
}

type DecisionMemoryWorkspaceProps = {
  candidateId: string;
  surface: DecisionMemorySurface;
};

export function DecisionMemoryWorkspace({ candidateId, surface }: DecisionMemoryWorkspaceProps) {
  const record = resolveDecisionMemory(candidateId);
  if (!record) {
    return <DecisionMemoryNotFound surface={surface} />;
  }
  return <DecisionMemoryContent record={record} surface={surface} />;
}
