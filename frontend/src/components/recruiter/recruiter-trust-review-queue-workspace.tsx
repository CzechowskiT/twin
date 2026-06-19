"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { Card, Shell } from "@/components/ui";
import type { TrustReviewQueueItem } from "@/lib/recruiter-trust-review-queue-demo-data";
import {
  LAUNCH_STANCE,
  RECRUITER_TRUST_REVIEW_QUEUE_MARKERS,
  RECRUITER_TRUST_REVIEW_QUEUE_MODULE_LINKS,
  RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER,
  loadRecruiterTrustReviewQueue,
  resolveRecruiterTrustReviewQueue,
  type SafePersistenceSource,
} from "@/lib/recruiter-trust-review-queue";
import { requestIntakeRecruiterHref } from "@/lib/request-intake";
import type { TranslationKey } from "@/lib/i18n";

function sectionCard(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={marker}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">{children}</div>
    </Card>
  );
}

function statusKey(status: TrustReviewQueueItem["status"]): TranslationKey {
  const map: Record<TrustReviewQueueItem["status"], TranslationKey> = {
    preview: "recruiterTrustReviewQueue.statusPreview",
    review_required: "recruiterTrustReviewQueue.statusReviewRequired",
    planned: "recruiterTrustReviewQueue.statusPlanned",
  };
  return map[status];
}

export function RecruiterTrustReviewQueueWorkspace() {
  const { t } = useTranslation();
  const [record, setRecord] = useState(() => resolveRecruiterTrustReviewQueue());
  const [source, setSource] = useState<SafePersistenceSource>("demo");
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let active = true;
    void loadRecruiterTrustReviewQueue().then((res) => {
      if (!active) return;
      setRecord(res.record);
      setSource(res.source);
      setLiveCount(res.liveCount);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";

  return (
    <Shell wide rail>
      <div
        data-recruiter-trust-review-queue-page={RECRUITER_TRUST_REVIEW_QUEUE_PAGE_MARKER}
        data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.page}
        className="space-y-6"
      >
        <RecruiterWorkspaceNav />

        <header
          className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6"
          data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.header}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("recruiterTrustReviewQueue.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-2xl sm:text-3xl">{t("recruiterTrustReviewQueue.pageTitle")}</h1>
              <p className="text-sm text-[var(--twin-muted-strong)]">{record.headline}</p>
              <p className="text-xs text-[var(--twin-muted)]" data-testid="recruiter-trust-review-queue-data-source">
                {t(sourceKey)}
                {source === "live" ? ` · ${liveCount} ${t("safePersistence.internalRecords")}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase text-violet-200"
                data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.pilotBadge}
              >
                {t("recruiterTrustReviewQueue.pilotBadge")}
              </span>
              <span
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase text-amber-200"
                data-launch-stance={LAUNCH_STANCE}
              >
                {t("recruiterDailyCockpit.launchNoGoBadge")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {RECRUITER_TRUST_REVIEW_QUEUE_MODULE_LINKS.slice(0, 2).map((link) => (
              <Link key={link.id} href={link.href} className="twin-link font-medium">
                {t(link.labelKey)}
              </Link>
            ))}
            <Link href={requestIntakeRecruiterHref()} data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.requestIntakeLink} className="twin-link font-medium">
              {t("recruiterTrustReviewQueue.linkRequestIntake")}
            </Link>
          </div>
        </header>

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.summary,
          t("recruiterTrustReviewQueue.summaryTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.summaryLead")}</p>
            <dl className="grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">{t("recruiterTrustReviewQueue.summaryTotal")}</dt>
                <dd className="text-lg font-semibold">{record.summary_total}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">
                  {t("recruiterTrustReviewQueue.summaryReviewRequired")}
                </dt>
                <dd className="text-lg font-semibold">{record.summary_review_required}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--twin-muted)]">
                  {t("recruiterTrustReviewQueue.summaryPreviewOnly")}
                </dt>
                <dd className="text-lg font-semibold">{record.summary_preview_only}</dd>
              </div>
            </dl>
          </>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.table,
          t("recruiterTrustReviewQueue.tableTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.tableLead")}</p>
            <ul className="space-y-2">
              {record.queue_items.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={item.candidate_href} className="twin-link font-medium">
                      {t(item.label_key as TranslationKey)}
                    </Link>
                    <span className="text-[10px] uppercase text-[var(--twin-muted)]">{item.priority}</span>
                    <span className="text-[10px] uppercase text-[var(--twin-accent)]">{t(statusKey(item.status))}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{item.summary}</p>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.priority,
          t("recruiterTrustReviewQueue.priorityTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.priorityLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>{t("recruiterTrustReviewQueue.priorityHigh")}</li>
              <li>{t("recruiterTrustReviewQueue.priorityMedium")}</li>
              <li>{t("recruiterTrustReviewQueue.priorityLow")}</li>
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.evidence,
          t("recruiterTrustReviewQueue.evidenceTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.evidenceLead")}</p>
            <ul className="space-y-1">
              {record.evidence_refs.map((ref) => (
                <li key={ref.id}>
                  <Link href={ref.href} className="twin-link text-xs">
                    {t(ref.label_key as TranslationKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.suggested,
          t("recruiterTrustReviewQueue.suggestedTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.suggestedLead")}</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>{t("recruiterTrustReviewQueue.suggestedReviewCorrection")}</li>
              <li>{t("recruiterTrustReviewQueue.suggestedReviewPortability")}</li>
              <li>{t("recruiterTrustReviewQueue.suggestedIdentityPilot")}</li>
            </ul>
          </>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.boundary,
          t("recruiterTrustReviewQueue.boundaryTitle"),
          <p className="text-xs text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.boundaryBody")}</p>,
        )}

        {sectionCard(
          RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.linkedModules,
          t("recruiterTrustReviewQueue.linkedModulesTitle"),
          <>
            <p className="text-[var(--twin-muted-strong)]">{t("recruiterTrustReviewQueue.linkedModulesLead")}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {RECRUITER_TRUST_REVIEW_QUEUE_MODULE_LINKS.map((link) => (
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
