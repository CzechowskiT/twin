"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { Card, Shell } from "@/components/ui";
import type { CockpitQueueItem } from "@/lib/company-hiring-cockpit-demo-data";
import {
  companyCandidateProfileHref,
  companyRolePipelineHref,
  LAUNCH_STANCE,
  COMPANY_HIRING_COCKPIT_MARKERS,
  COMPANY_HIRING_COCKPIT_MODULE_LINKS,
  COMPANY_HIRING_COCKPIT_PAGE_MARKER,
  resolveCompanyHiringCockpit,
} from "@/lib/company-hiring-cockpit";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";

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
            <Link href={companyCandidateProfileHref(item.candidate_id)} className="twin-link font-medium">
              {item.candidate_display}
            </Link>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${priorityBadge(item.priority)}`}>
              {item.priority}
            </span>
          </div>
          <p className="twin-muted mt-1 text-xs">{item.summary}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href={companyCandidateProfileHref(item.candidate_id)} className="twin-link">
              {profileLabel}
            </Link>
            <Link href={companyRolePipelineHref(item.role_id)} className="twin-link">
              {item.role_id}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CompanyHiringTeamCockpitWorkspace() {
  const { t } = useTranslation();
  const record = resolveCompanyHiringCockpit();

  return (
    <Shell wide rail>
      <div data-company-hiring-cockpit-page={COMPANY_HIRING_COCKPIT_PAGE_MARKER} className="space-y-6">
        <CompanyWorkspaceNav />

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={COMPANY_HIRING_COCKPIT_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("companyHiringCockpit.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("companyHiringCockpit.title")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("companyHiringCockpit.lead")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <WorkspaceStatusBadge status="pilot" testId={COMPANY_HIRING_COCKPIT_MARKERS.pilotBadge} />
            </div>
          </div>
          <p className="text-xs text-[var(--twin-muted-strong)]">
            {t("companyHiringCockpit.sampleContextLead")}{" "}
            <span className="font-mono">{record.candidate_id}</span> ·{" "}
            <span className="font-mono">{record.role_id}</span> ·{" "}
            <span className="font-mono">{record.ats_connector_id}</span>
          </p>
          <nav
            className="flex flex-wrap gap-2"
            data-testid={COMPANY_HIRING_COCKPIT_MARKERS.moduleLinks}
            aria-label={t("companyHiringCockpit.moduleLinksTitle")}
          >
            {COMPANY_HIRING_COCKPIT_MODULE_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="rounded-full border border-[var(--twin-border)] px-3 py-1 text-xs font-medium transition hover:border-[var(--twin-accent)]/40"
                data-testid={`company-hiring-cockpit-link-${link.id}`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.openRoles,
            t("companyHiringCockpit.openRolesTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.openRolesLead")}</p>
              <ul className="space-y-2">
                {record.open_roles.map((role) => (
                  <li
                    key={role.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={companyRolePipelineHref(role.role_id)} className="twin-link font-medium">
                        {role.title}
                      </Link>
                      <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-[10px] uppercase">
                        {role.status}
                      </span>
                      <span className="text-xs text-[var(--twin-muted-strong)]">
                        {role.candidates_in_pipeline} {t("companyHiringCockpit.inPipeline")}
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
            COMPANY_HIRING_COCKPIT_MARKERS.candidateShortlist,
            t("companyHiringCockpit.candidateShortlistTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.candidateShortlistLead")}</p>
              {queueList(record.candidate_shortlist, t("companyHiringCockpit.openProfile"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.pendingFeedback,
            t("companyHiringCockpit.pendingFeedbackTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.pendingFeedbackLead")}</p>
              {queueList(record.pending_feedback, t("companyHiringCockpit.openNotes"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.scorecardsReview,
            t("companyHiringCockpit.scorecardsReviewTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.scorecardsReviewLead")}</p>
              {queueList(record.scorecards_review, t("companyHiringCockpit.openNotes"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.trustConsentWarnings,
            t("companyHiringCockpit.trustConsentTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.trustConsentLead")}</p>
              {queueList(record.trust_consent_warnings, t("companyHiringCockpit.openTrust"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.teamAssignments,
            t("companyHiringCockpit.teamAssignmentsTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.teamAssignmentsLead")}</p>
              <ul className="space-y-2">
                {record.team_assignments.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={companyCandidateProfileHref(item.candidate_id)} className="twin-link font-medium">
                        {item.candidate_display}
                      </Link>
                      <span className="text-xs text-[var(--twin-muted-strong)]">
                        {item.assignee} · {item.role}
                      </span>
                    </div>
                    <p className="twin-muted mt-1 text-xs">{item.summary}</p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.communicationDrafts,
            t("companyHiringCockpit.commDraftsTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.commDraftsLead")}</p>
              {queueList(record.communication_drafts, t("companyHiringCockpit.openCommunication"))}
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.pipelineOverview,
            t("companyHiringCockpit.pipelineOverviewTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.pipelineOverviewLead")}</p>
              <p className="text-xs font-medium">
                {record.role_title} ·{" "}
                <Link href={companyRolePipelineHref(record.role_id)} className="twin-link">
                  {record.role_id}
                </Link>
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {record.pipeline_overview.map((stage) => (
                  <li
                    key={stage.stage}
                    className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2 text-center"
                  >
                    <p className="text-lg font-semibold tabular-nums">{stage.count}</p>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--twin-muted-strong)]">
                      {stage.stage}
                    </p>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.decisionChecklist,
            t("companyHiringCockpit.decisionChecklistTitle"),
            <>
              <p className="twin-muted text-xs">{t("companyHiringCockpit.decisionChecklistLead")}</p>
              <ul className="space-y-2">
                {record.decision_checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={item.done} disabled readOnly className="mt-0.5" aria-label={item.label} />
                    <span>
                      {item.label}
                      {item.boundary === "no_outreach" ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({t("companyHiringCockpit.boundaryNoOutreach")})
                        </span>
                      ) : null}
                      {item.boundary === "no_ats_sync" ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300">
                          ({t("companyHiringCockpit.boundaryNoAtsSync")})
                        </span>
                      ) : null}
                      {item.boundary === "launch_no_go" ? (
                        <span className="ml-1 text-rose-700 dark:text-rose-300">
                          ({t("companyHiringCockpit.boundaryLaunchNoGo")})
                        </span>
                      ) : null}
                      {item.boundary === "phase3b_blocked" ? (
                        <span className="ml-1 text-rose-700 dark:text-rose-300">
                          ({t("companyHiringCockpit.boundaryPhase3bBlocked")})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>,
          )}

          {sectionCard(
            COMPANY_HIRING_COCKPIT_MARKERS.humanBoundary,
            t("companyHiringCockpit.humanBoundaryTitle"),
            <>
              <p className="text-sm leading-relaxed">{t("companyHiringCockpit.humanBoundaryBody")}</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>· {t("companyHiringCockpit.humanPoint1")}</li>
                <li>· {t("companyHiringCockpit.humanPoint2")}</li>
                <li>· {t("companyHiringCockpit.humanPoint3")}</li>
                <li>· {t("companyHiringCockpit.humanPoint4")}</li>
              </ul>
              <p className="twin-muted mt-2 text-xs">{t("companyHiringCockpit.humanBoundaryNote")}</p>
            </>,
            "lg:col-span-2",
          )}
        </div>
      </div>
    </Shell>
  );
}
