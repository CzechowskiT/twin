"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { LiveOperatingStatePanel } from "@/components/shared/live-operating-state-panel";
import { CompactAuditTrailWidget } from "@/components/shared/compact-audit-trail-widget";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import { loadRecruiterOperatingState, type OperatingStateSummary } from "@/lib/live-operating-state";
import {
  LAUNCH_STANCE,
  RECRUITER_DAILY_COCKPIT_MARKERS,
  RECRUITER_DAILY_COCKPIT_MODULE_LINKS,
  RECRUITER_DAILY_COCKPIT_PAGE_MARKER,
} from "@/lib/recruiter-daily-operating-cockpit";
import {
  resolveRecruiterSchedulingProof,
  SCHEDULING_PROOF_LINKS,
} from "@/lib/recruiter-company-scheduling-proof";
import {
  microsoftBusyReadStageKey,
  resolveMicrosoftCalendarReadiness,
} from "@/lib/microsoft-calendar-readiness";
import { MicrosoftBusySlotPreviewPanel } from "@/components/shared/microsoft-busy-slot-preview-panel";
import { useMicrosoftBusyReadLive } from "@/lib/use-microsoft-busy-read-live";

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

export function RecruiterDailyOperatingCockpitWorkspace() {
  const { t } = useTranslation();
  const schedulingProof = useMemo(() => resolveRecruiterSchedulingProof(), []);
  const microsoftReadiness = useMemo(() => resolveMicrosoftCalendarReadiness(), []);
  const { record: busyReadRecord } = useMicrosoftBusyReadLive();
  const moduleLinks = useMemo(() => RECRUITER_DAILY_COCKPIT_MODULE_LINKS, []);
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

  const liveChannels = operatingState?.channels ?? [];

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
          <nav
            className="flex flex-wrap gap-2"
            data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.moduleLinks}
            aria-label={t("recruiterDailyCockpit.moduleLinksTitle")}
          >
            {moduleLinks.map((link) => (
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
              <ul className="space-y-2" data-testid="recruiter-daily-cockpit-live-queues">
                {liveChannels.length === 0 ? (
                  <li className="twin-muted text-xs">{t("liveOperatingState.loading")}</li>
                ) : (
                  liveChannels.map((ch) => (
                    <li
                      key={ch.id}
                      className="rounded-lg border border-[var(--twin-border)]/60 bg-[var(--twin-surface)]/40 px-3 py-2"
                      data-queue-source={ch.source}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={ch.href} className="twin-link font-medium">
                          {t(ch.labelKey)}
                        </Link>
                        <span className="rounded-full border border-[var(--twin-border)] px-2 py-0.5 text-[10px] uppercase tabular-nums">
                          {ch.count} · {ch.source}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.decisionQueue,
            t("recruiterDailyCockpit.decisionQueueTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.decisionQueueLead")}</p>
              <Link href="/recruiter/inbox" className="twin-link text-sm">
                {t("recruiterDailyCockpit.linkPipeline")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.trustConsentQueue,
            t("recruiterDailyCockpit.trustConsentTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.trustConsentLead")}</p>
              <Link href="/recruiter/trust-review-queue" className="twin-link text-sm">
                {t("recruiterDailyCockpit.linkTrust")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.feedbackScorecardQueue,
            t("recruiterDailyCockpit.feedbackScorecardTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.feedbackScorecardLead")}</p>
              <Link href="/recruiter/work-items" className="twin-link text-sm">
                {t("recruiterDailyCockpit.openNotes")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.commDraftsQueue,
            t("recruiterDailyCockpit.commDraftsTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.commDraftsLead")}</p>
              <Link href="/recruiter/inbox" className="twin-link text-sm">
                {t("recruiterDailyCockpit.openCommunication")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.atsImportQueue,
            t("recruiterDailyCockpit.atsImportTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.atsImportLead")}</p>
              <Link href="/recruiter/ats-import-readiness" className="twin-link text-sm">
                {t("recruiterDailyCockpit.linkAtsReadiness")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.pipelineChanges,
            t("recruiterDailyCockpit.pipelineChangesTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.pipelineChangesLead")}</p>
              <Link href="/recruiter/pipeline" className="twin-link text-sm">
                {t("recruiterDailyCockpit.linkPipeline")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.weeklyDigest,
            t("recruiterDailyCockpit.digestTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.digestLead")}</p>
              <Link href="/recruiter/talent-radar" className="twin-link text-sm">
                {t("recruiterDailyCockpit.openProfile")} →
              </Link>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.dailyChecklist,
            t("recruiterDailyCockpit.dailyChecklistTitle"),
            <>
              <p className="twin-muted text-xs">{t("recruiterDailyCockpit.dailyChecklistLead")}</p>
              <ul className="space-y-1 text-xs">
                <li>· {t("recruiterDailyCockpit.humanPoint1")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint2")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint3")}</li>
                <li>· {t("recruiterDailyCockpit.humanPoint4")}</li>
              </ul>
            </>,
          )}

          {sectionCard(
            RECRUITER_DAILY_COCKPIT_MARKERS.schedulingProof,
            t("schedulingProof.recruiterPanelTitle"),
            <>
              <p className="twin-muted text-xs">{schedulingProof.headline}</p>
              <p className="twin-muted text-xs">{t("schedulingProof.recruiterPanelLead")}</p>
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
                <p className="text-xs font-medium" data-testid="microsoft-calendar-readiness-busy-read">
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

          {busyReadRecord ? <MicrosoftBusySlotPreviewPanel record={busyReadRecord} compact /> : null}

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

        <OperationalCrossLinksPanel />
      </div>
    </Shell>
  );
}
