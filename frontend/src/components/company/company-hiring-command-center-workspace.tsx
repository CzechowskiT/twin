"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { LiveOperatingStatePanel } from "@/components/shared/live-operating-state-panel";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import { loadCompanyOperatingState, type OperatingStateSummary } from "@/lib/live-operating-state";
import type { CommandCenterQueueItem } from "@/lib/company-hiring-command-center-demo-data";
import {
  companyCommandCenterPipelineHref,
  companyCommandCenterProfileHref,
  LAUNCH_STANCE,
  COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS,
  COMPANY_HIRING_COMMAND_CENTER_MARKERS,
  COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS,
  COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER,
  resolveCompanyHiringCommandCenter,
} from "@/lib/company-hiring-command-center";
import {
  resolveCompanySchedulingProof,
  SCHEDULING_PROOF_LINKS,
} from "@/lib/recruiter-company-scheduling-proof";
import {
  microsoftBusyReadStageKey,
  resolveMicrosoftCalendarReadiness,
} from "@/lib/microsoft-calendar-readiness";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode, className = ""): ReactNode {
  return (
    <Card variant="soft" className={`border-[var(--twin-border)]/80 p-5 sm:p-6 ${className}`}>
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
      </div>
    </Card>
  );
}

function priorityBadge(priority: CommandCenterQueueItem["priority"]): string {
  if (priority === "high") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (priority === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-[var(--twin-border)] text-[var(--twin-muted-strong)]";
}

function queueList(items: CommandCenterQueueItem[], profileLabel: string): ReactNode {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={companyCommandCenterProfileHref(item.candidate_id)} className="twin-link font-medium">
              {item.candidate_display}
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${priorityBadge(item.priority)}`}>
              {item.priority}
            </span>
          </div>
          <p className="twin-muted mt-1 text-xs">{item.summary}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href={companyCommandCenterProfileHref(item.candidate_id)} className="twin-link">
              {profileLabel}
            </Link>
            <Link href={companyCommandCenterPipelineHref(item.role_id)} className="twin-link">
              {item.role_id}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CompanyHiringCommandCenterWorkspace() {
  const { t } = useTranslation();
  const record = useMemo(() => resolveCompanyHiringCommandCenter(), []);
  const schedulingProof = useMemo(() => resolveCompanySchedulingProof(), []);
  const microsoftReadiness = useMemo(() => resolveMicrosoftCalendarReadiness(), []);
  const moduleLinks = useMemo(() => COMPANY_HIRING_COMMAND_CENTER_MODULE_LINKS, []);
  const disabledActions = useMemo(() => COMPANY_HIRING_COMMAND_CENTER_DISABLED_ACTIONS, []);
  const [operatingState, setOperatingState] = useState<OperatingStateSummary | null>(null);

  useEffect(() => {
    let active = true;
    void loadCompanyOperatingState().then((res) => {
      if (active) setOperatingState(res);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell wide rail>
      <div
        data-company-hiring-command-center-page={COMPANY_HIRING_COMMAND_CENTER_PAGE_MARKER}
        data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.page}
        className="space-y-6"
      >
        <CompanyWorkspaceNav />

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("companyHiringCommandCenter.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("companyHiringCommandCenter.title")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("companyHiringCommandCenter.lead")}</p>
              <p
                className="text-xs text-[var(--twin-muted)]"
                data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.operatingStateSource}
              >
                {operatingState ? t(operatingState.sourceKey) : t("liveOperatingState.loading")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-200"
                data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.pilotBadge}
              >
                {t("companyHiringCommandCenter.pilotBadge")}
              </span>
              <span
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
                data-launch-stance={LAUNCH_STANCE}
              >
                {t("companyHiringCommandCenter.launchNoGoBadge")}
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                {t("companyHiringCommandCenter.draftOnlyBadge")}
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--twin-muted-strong)]">
            {t("companyHiringCommandCenter.sampleContextLead")}{" "}
            <span className="font-mono">{record.candidate_id}</span> ·{" "}
            <span className="font-mono">{record.role_id}</span> ·{" "}
            <span className="font-mono">{record.ats_connector_id}</span>
          </p>
          <nav
            className="flex flex-wrap gap-2"
            data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.moduleLinks}
            aria-label={t("companyHiringCommandCenter.moduleLinksTitle")}
          >
            {moduleLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-medium transition hover:border-[var(--twin-accent)]/40"
                data-testid={`company-hiring-command-center-link-${link.id}`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </header>

        <LiveOperatingStatePanel
          titleKey="companyHiringCommandCenter.operatingStateTitle"
          leadKey="companyHiringCommandCenter.operatingStateLead"
          summary={operatingState}
          testId={COMPANY_HIRING_COMMAND_CENTER_MARKERS.operatingState}
        />

        <CompactAuditTrailWidget />

        <div className="grid gap-6 lg:grid-cols-2">
          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.roleReadiness,
            t("companyHiringCommandCenter.roleReadinessTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.roleReadinessLead")}</p>
              <ul className="space-y-2">
                {record.role_readiness.map((role) => (
                  <li
                    key={role.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={companyCommandCenterPipelineHref(role.role_id)} className="twin-link font-medium">
                        {role.title}
                      </Link>
                      <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] uppercase">
                        {role.readiness}
                      </span>
                      <span className="text-xs text-[var(--twin-muted-strong)]">
                        {role.blockers} {t("companyHiringCommandCenter.blockersLabel")}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{role.summary}</p>
                    <Link href={`${COMPANY_ROLES_ROUTE}/${role.role_id}`} className="twin-link mt-2 inline-block text-xs">
                      {role.role_id}
                    </Link>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.shortlist,
            t("companyHiringCommandCenter.shortlistTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.shortlistLead")}</p>
              {queueList(record.shortlist, t("companyHiringCommandCenter.openProfile"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.pendingFeedback,
            t("companyHiringCommandCenter.pendingFeedbackTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.pendingFeedbackLead")}</p>
              {queueList(record.pending_feedback, t("companyHiringCommandCenter.openNotes"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.decisionBlockers,
            t("companyHiringCommandCenter.decisionBlockersTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.decisionBlockersLead")}</p>
              <ul className="space-y-2">
                {record.decision_blockers.map((blocker) => (
                  <li
                    key={blocker.id}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs"
                  >
                    <Link href={companyCommandCenterProfileHref(blocker.candidate_id)} className="twin-link font-medium">
                      {blocker.candidate_display}
                    </Link>
                    <p className="mt-1 text-[var(--twin-muted-strong)]">
                      {t(blocker.blocker_key as TranslationKey)} · {blocker.owner}
                    </p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.trustBoundaries,
            t("companyHiringCommandCenter.trustBoundariesTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.trustBoundariesLead")}</p>
              {queueList(record.trust_boundaries, t("companyHiringCommandCenter.openTrust"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.hiringTeamTasks,
            t("companyHiringCommandCenter.hiringTeamTasksTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.hiringTeamTasksLead")}</p>
              <ul className="space-y-2">
                {record.hiring_team_tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{task.assignee}</span>
                    <p className="mt-1">{t(task.task_key as TranslationKey)} — {task.candidate_display}</p>
                    <p className="twin-muted mt-1">{task.due_date}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.nextMeetingReadiness,
            t("companyHiringCommandCenter.nextMeetingTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCommandCenter.nextMeetingLead")}</p>
              <ul className="space-y-2">
                {record.next_meetings.map((meeting) => (
                  <li
                    key={meeting.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t(meeting.title_key as TranslationKey)}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">{meeting.readiness}</span>
                    </div>
                    <p className="twin-muted mt-1">{meeting.scheduled_at}</p>
                    <p className="mt-1">{t(meeting.summary_key as TranslationKey)}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.schedulingProof,
            t("schedulingProof.companyPanelTitle"),
            <>
              <p className="twin-muted text-xs">{schedulingProof.headline}</p>
              <p className="twin-muted text-xs">{t("schedulingProof.companyPanelLead")}</p>
              <ul className="space-y-2">
                {schedulingProof.items.map((item) => (
                  <li key={item.id} className="rounded border border-[var(--twin-border)]/60 p-2 text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-[var(--twin-muted)]">· {item.status}</span>
                    <p className="mt-1 text-[var(--twin-muted)]">{item.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[var(--twin-muted)]">{schedulingProof.blocked_note}</p>
              {microsoftReadiness ? (
                <p
                  className="text-xs font-medium"
                  data-testid="microsoft-calendar-readiness-busy-read"
                >
                  {t("microsoftCalendarReadiness.busyReadTitle")}:{" "}
                  {t(microsoftBusyReadStageKey(microsoftReadiness.busy_read_stage))}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {SCHEDULING_PROOF_LINKS.map((link) => (
                  <Link key={link.id} href={link.href} className="twin-link text-xs">
                    {t(link.labelKey)}
                  </Link>
                ))}
              </div>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COMMAND_CENTER_MARKERS.boundaryPanel,
            t("companyHiringCommandCenter.boundaryPanelTitle"),
            <>
              <p className="text-sm leading-relaxed">{t("companyHiringCommandCenter.boundaryPanelBody")}</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>· {t("companyHiringCommandCenter.boundaryPoint1")}</li>
                <li>· {t("companyHiringCommandCenter.boundaryPoint2")}</li>
                <li>· {t("companyHiringCommandCenter.boundaryPoint3")}</li>
                <li>· {t("companyHiringCommandCenter.launchNoGoLine")}</li>
                <li>· {t("companyHiringCommandCenter.p0OpenLine")}</li>
                <li>· {t("companyHiringCommandCenter.phase3bBlockedLine")}</li>
              </ul>
              <div
                className="mt-4 flex flex-wrap gap-2"
                data-testid={COMPANY_HIRING_COMMAND_CENTER_MARKERS.disabledActions}
              >
                {disabledActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded border border-[var(--twin-border)] px-3 py-1.5 text-xs font-medium opacity-50"
                    title={t("companyHiringCommandCenter.actionNotLiveHint")}
                    data-testid={`company-hiring-command-center-action-${action.key}-disabled`}
                  >
                    {t(action.labelKey)} · {t("companyHiringCommandCenter.notLive")}
                  </button>
                ))}
              </div>
              <p className="twin-muted mt-3 text-xs">{t("companyHiringCommandCenter.boundaryPanelNote")}</p>
            </>,
            "lg:col-span-2",
          )}
        </div>

        <OperationalCrossLinksPanel />
      </div>
    </Shell>
  );
}
