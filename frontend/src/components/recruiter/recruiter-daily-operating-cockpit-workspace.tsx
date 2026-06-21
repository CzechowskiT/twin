"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { LiveOperatingStatePanel } from "@/components/shared/live-operating-state-panel";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { Card, Shell } from "@/components/ui";
import { loadRecruiterOperatingState, type OperatingStateSummary } from "@/lib/live-operating-state";
import type { CockpitQueueItem } from "@/lib/recruiter-daily-operating-cockpit-demo-data";
import {
  candidatePipelineHref,
  candidateProfileHref,
  LAUNCH_STANCE,
  RECRUITER_DAILY_COCKPIT_MARKERS,
  RECRUITER_DAILY_COCKPIT_MODULE_LINKS,
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
  resolveRecruiterDailyCockpit,
} from "@/lib/recruiter-daily-operating-cockpit";

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

function priorityBadge(priority: CockpitQueueItem["priority"]): string {
  if (priority === "high") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (priority === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-[var(--twin-border)] text-[var(--twin-muted-strong)]";
}

function queueList(items: CockpitQueueItem[], profileLabel: string): ReactNode {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={candidateProfileHref(item.candidate_id)} className="twin-link font-medium">
              {item.candidate_display}
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${priorityBadge(item.priority)}`}>
              {item.priority}
            </span>
          </div>
          <p className="twin-muted mt-1 text-xs">{item.summary}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href={candidateProfileHref(item.candidate_id)} className="twin-link">
              {profileLabel}
            </Link>
            <Link href={candidatePipelineHref(item.role_id)} className="twin-link">
              {item.role_id}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecruiterDailyOperatingCockpitWorkspace() {
  const { t } = useTranslation();
  const record = resolveRecruiterDailyCockpit();
  const [operatingState, setOperatingState] = useState<OperatingStateSummary | null>(null);

  useEffect(() => {
    let active = true;
    void loadRecruiterOperatingState().then((res) => {
      if (active) setOperatingState(res);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell wide rail>
      <div data-recruiter-daily-cockpit-page={RECRUITER_DAILY_COCKPIT_PAGE_MARKER} className="space-y-6">
        <RecruiterWorkspaceNav />

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("recruiterDailyCockpit.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("recruiterDailyCockpit.title")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("recruiterDailyCockpit.lead")}</p>
              <p
                className="text-xs text-[var(--twin-muted)]"
                data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.operatingStateSource}
              >
                {operatingState ? t(operatingState.sourceKey) : t("liveOperatingState.loading")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200"
                data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.pilotBadge}
              >
                {t("recruiterDailyCockpit.pilotBadge")}
              </span>
              <span
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
                data-launch-stance={LAUNCH_STANCE}
              >
                {t("recruiterDailyCockpit.launchNoGoBadge")}
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                {t("recruiterDailyCockpit.draftOnlyBadge")}
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--twin-muted-strong)]">
            {t("recruiterDailyCockpit.sampleContextLead")}{" "}
            <span className="font-mono">{record.candidate_id}</span> ·{" "}
            <span className="font-mono">{record.role_id}</span> ·{" "}
            <span className="font-mono">{record.ats_connector_id}</span>
          </p>
          <nav
            className="flex flex-wrap gap-2"
            data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.moduleLinks}
            aria-label={t("recruiterDailyCockpit.moduleLinksTitle")}
          >
            {RECRUITER_DAILY_COCKPIT_MODULE_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-medium transition hover:border-[var(--twin-accent)]/40"
                data-testid={`recruiter-daily-cockpit-link-${link.id}`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
        <LiveOperatingStatePanel
          titleKey="recruiterDailyCockpit.operatingStateTitle"
          leadKey="recruiterDailyCockpit.operatingStateLead"
          summary={operatingState}
          testId={RECRUITER_DAILY_COCKPIT_MARKERS.operatingState}
        />

        <CompactAuditTrailWidget />

        {sectionCard(
          RECRUITER_DAILY_COCKPIT_MARKERS.priorityWorklist,
          t("recruiterDailyCockpit.priorityWorklistTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.priorityWorklistLead")}</p>
              {queueList(record.priority_worklist, t("recruiterDailyCockpit.openProfile"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.decisionQueue,
            t("recruiterDailyCockpit.decisionQueueTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.decisionQueueLead")}</p>
              {queueList(record.open_decisions, t("recruiterDailyCockpit.openProfile"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.trustConsentQueue,
            t("recruiterDailyCockpit.trustConsentTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.trustConsentLead")}</p>
              {queueList(record.consent_review, t("recruiterDailyCockpit.openTrust"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.feedbackScorecardQueue,
            t("recruiterDailyCockpit.feedbackScorecardTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.feedbackScorecardLead")}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("recruiterDailyCockpit.feedbackMissingLabel")}
              </p>
              {queueList(record.feedback_missing, t("recruiterDailyCockpit.openNotes"))}
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
                {t("recruiterDailyCockpit.scorecardsPendingLabel")}
              </p>
              {queueList(record.scorecards_pending, t("recruiterDailyCockpit.openNotes"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.commDraftsQueue,
            t("recruiterDailyCockpit.commDraftsTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.commDraftsLead")}</p>
              {queueList(record.comm_drafts_review, t("recruiterDailyCockpit.openCommunication"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.atsImportQueue,
            t("recruiterDailyCockpit.atsImportTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.atsImportLead")}</p>
              <ul className="space-y-2">
                {record.ats_import_queue.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.connector}</span>
                      <span className="rounded-full border border-sky-500/30 px-2 py-0.5 text-[10px] uppercase">
                        {item.status}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{item.issue}</p>
                    <p className="mt-1 text-xs">
                      {item.candidate_id} · {item.role_id}
                    </p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.pipelineChanges,
            t("recruiterDailyCockpit.pipelineChangesTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.pipelineChangesLead")}</p>
              <ul className="space-y-2">
                {record.pipeline_stage_changes.map((change) => (
                  <li
                    key={change.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={candidateProfileHref(change.candidate_id)} className="twin-link font-medium">
                        {change.candidate_display}
                      </Link>
                      <span className="text-xs">
                        {change.from_stage} → {change.to_stage}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{change.rationale}</p>
                    <p className="mt-1 text-[10px] text-[var(--twin-muted-strong)]">{change.changed_at}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.weeklyDigest,
            t("recruiterDailyCockpit.digestTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.digestLead")}</p>
              {queueList(record.weekly_digest_candidates, t("recruiterDailyCockpit.openProfile"))}
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.dailyChecklist,
            t("recruiterDailyCockpit.dailyChecklistTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.dailyChecklistLead")}</p>
              <ul className="space-y-2">
                {record.daily_checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={item.done} disabled readOnly className="mt-0.5" aria-label={item.label} />
                    <span>
                      {item.label}
                      {item.boundary === "no_outreach" ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({t("recruiterDailyCockpit.boundaryNoOutreach")})
                        </span>
                      ) : null}
                      {item.boundary === "no_ats_sync" ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({t("recruiterDailyCockpit.boundaryNoAtsSync")})
                        </span>
                      ) : null}
                      {item.boundary === "launch_no_go" ? (
                        <span className="ml-1 text-rose-700 dark:text-rose-300">
                          ({t("recruiterDailyCockpit.boundaryLaunchNoGo")})
                        </span>
                      ) : null}
                      {item.boundary === "phase3b_blocked" ? (
                        <span className="ml-1 text-rose-700 dark:text-rose-300">
                          ({t("recruiterDailyCockpit.boundaryPhase3bBlocked")})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.humanBoundary,
            t("recruiterDailyCockpit.humanBoundaryTitle"),
            <>
              <p className="text-sm leading-relaxed">{t("recruiterDailyCockpit.humanBoundaryBody")}</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>· {t("recruiterDailyCockpit.humanPoint1")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint2")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint3")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint4")}</li>
              </ul>
              <p className="twin-muted mt-2 text-xs">{t("recruiterDailyCockpit.humanBoundaryNote")}</p>
            </>,
            "lg:col-span-2",
          )}
        </div>
      </div>
    </Shell>
  );
}
