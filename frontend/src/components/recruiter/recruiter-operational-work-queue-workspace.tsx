"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import type { WorkQueueItem } from "@/lib/recruiter-operational-work-queue-demo-data";
import {
  LAUNCH_STANCE,
  RECRUITER_OPERATIONAL_WORK_QUEUE_DISABLED_ACTIONS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_MODULE_LINKS,
  RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER,
  resolveRecruiterOperationalWorkQueue,
} from "@/lib/recruiter-operational-work-queue";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
      </div>
    </Card>
  );
}

function worklistItems(items: WorkQueueItem[], t: (k: TranslationKey) => string): ReactNode {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={item.candidate_href} className="twin-link font-medium">
              {item.candidate_display}
            </Link>
            <span className="text-[10px] uppercase text-[var(--twin-muted)]">{item.role_title}</span>
            <span className="text-[10px] uppercase text-[var(--twin-accent)]">{item.priority}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">
            {t(item.next_action_key as TranslationKey)} · {item.owner} · {item.due_date}
          </p>
          <p className="text-[10px] text-[var(--twin-muted)]">{t(item.risk_boundary_key as TranslationKey)}</p>
        </li>
      ))}
    </ul>
  );
}

export function RecruiterOperationalWorkQueueWorkspace() {
  const { t } = useTranslation();
  const record = resolveRecruiterOperationalWorkQueue();

  return (
    <Shell wide rail>
      <div
        data-recruiter-operational-work-queue-page={RECRUITER_OPERATIONAL_WORK_QUEUE_PAGE_MARKER}
        data-testid={RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.page}
        className="space-y-6"
      >
        <RecruiterWorkspaceNav />

        <header className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6" data-testid={RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.header}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("recruiterOperationalWorkQueue.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("recruiterOperationalWorkQueue.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
            </div>
            <span
              className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase text-violet-200"
              data-testid={RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.pilotBadge}
              data-launch-stance={LAUNCH_STANCE}
            >
              {t("recruiterOperationalWorkQueue.pilotBadge")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {RECRUITER_OPERATIONAL_WORK_QUEUE_MODULE_LINKS.slice(0, 2).map((link) => (
              <Link key={link.id} href={link.href} className="twin-link font-medium">
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </header>

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.summary,
          t("recruiterOperationalWorkQueue.summaryTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.summaryLead")}</p>
            <dl className="grid gap-2 sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterOperationalWorkQueue.summaryActive")}</dt>
                <dd className="text-lg font-semibold">{record.summary_active}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterOperationalWorkQueue.summaryTrust")}</dt>
                <dd className="text-lg font-semibold">{record.summary_trust_review}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterOperationalWorkQueue.summaryFeedback")}</dt>
                <dd className="text-lg font-semibold">{record.summary_missing_feedback}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterOperationalWorkQueue.summaryStale")}</dt>
                <dd className="text-lg font-semibold">{record.summary_stale}</dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.activeWorklist,
          t("recruiterOperationalWorkQueue.activeTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.activeLead")}</p>
            {worklistItems(record.active_worklist, t)}
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.trustReview,
          t("recruiterOperationalWorkQueue.trustTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.trustLead")}</p>
            {worklistItems(record.trust_review, t)}
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.missingFeedback,
          t("recruiterOperationalWorkQueue.feedbackTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.feedbackLead")}</p>
            {worklistItems(record.missing_feedback, t)}
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.staleApplications,
          t("recruiterOperationalWorkQueue.staleTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.staleLead")}</p>
            {worklistItems(record.stale_applications, t)}
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.nextBestActions,
          t("recruiterOperationalWorkQueue.nbaTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.nbaLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {record.next_best_actions.map((nba) => (
                <li key={nba.id}>
                  {t(nba.action_key as TranslationKey)} — {nba.candidate_display}
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.ownerDueMap,
          t("recruiterOperationalWorkQueue.ownerTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.ownerLead")}</p>
            <ul className="space-y-1 text-xs">
              {record.owner_due_map.map((row) => (
                <li key={`${row.owner}-${row.due_date}`}>
                  {row.owner} · {row.due_date} · {row.count} {t("recruiterOperationalWorkQueue.itemsLabel")}
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.boundary,
          t("recruiterOperationalWorkQueue.boundaryTitle"),
          <>
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("recruiterOperationalWorkQueue.boundaryBody")}</p>
            <div className="mt-3 flex flex-wrap gap-2" data-testid={RECRUITER_OPERATIONAL_WORK_QUEUE_MARKERS.disabledActions}>
              {RECRUITER_OPERATIONAL_WORK_QUEUE_DISABLED_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded border border-[var(--twin-border)] px-3 py-1.5 text-xs font-medium opacity-50"
                  title={t("recruiterOperationalWorkQueue.actionNotLiveHint")}
                  data-testid={`recruiter-operational-work-queue-action-${action.key}-disabled`}
                >
                  {t(action.labelKey)} · {t("recruiterOperationalWorkQueue.notLive")}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {RECRUITER_OPERATIONAL_WORK_QUEUE_MODULE_LINKS.map((link) => (
                <Link key={link.id} href={link.href} className="twin-link">
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          </>,
        )}
      </div>
    </Shell>
  );
}
