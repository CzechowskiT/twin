"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { WorkspaceQuickActions } from "@/components/workspace/workspace-quick-actions";
import { Card, Shell } from "@/components/ui";
import { SHOW_RECRUITER_HUB_PRIMARY_PROMOS } from "@/lib/product-polish-p0";
import { SHOW_RECRUITER_HUB_NEXT_ACTION } from "@/lib/product-polish-p1";
import { SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED } from "@/lib/seven-day-d3-recruiter";
import { RecruiterHubNextAction } from "@/components/recruiter/recruiter-hub-next-action";
import { RECRUITER_DAILY_COCKPIT_MARKERS, recruiterDailyCockpitHref } from "@/lib/recruiter-daily-operating-cockpit";
import { RECRUITER_TRUST_REVIEW_QUEUE_MARKERS, recruiterTrustReviewQueueHref } from "@/lib/recruiter-trust-review-queue";

/** Canonical recruiter hub — system-of-record module grid with honest readiness badges. */
export default function RecruiterHubPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-6xl">
        <div className="mt-2">
          <WorkspaceQuickActions
            actions={[
              { href: "/recruiter/inbox", labelKey: "workspaceModules.recruiterInboxCta" },
              { href: "/recruiter/pipeline", labelKey: "workspaceModules.recruiterPipelineCta" },
              { href: "/recruiter/jobs", labelKey: "workspaceModules.recruiterJobsCta" },
              { href: "/recruiter/search", labelKey: "workspaceModules.recruiterSearchCta" },
            ]}
          />
        </div>
        {SHOW_RECRUITER_HUB_PRIMARY_PROMOS ? (
          <>
            <Link
              href={recruiterDailyCockpitHref()}
              data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.hubPromo}
              className="mt-6 block rounded-2xl transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]"
            >
              <Card
                variant="soft"
                className="border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-[var(--twin-surface-2)]/60 p-5 sm:p-6"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300">
                  {t("recruiterDailyCockpit.pageEyebrow")}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{t("recruiterDailyCockpit.title")}</h2>
                <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("recruiterDailyCockpit.lead")}</p>
                <p className="mt-4 text-sm font-medium text-[var(--twin-accent)]">{t("recruiterDailyCockpit.openDailyCockpit")} →</p>
              </Card>
            </Link>

            <Link
              href={recruiterTrustReviewQueueHref()}
              data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.hubPromo}
              className="mt-6 block rounded-2xl transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--twin-accent)]"
            >
              <Card
                variant="soft"
                className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-[var(--twin-surface-2)]/60 p-5 sm:p-6"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                  {t("recruiterTrustReviewQueue.pageEyebrow")}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{t("recruiterTrustReviewQueue.pageTitle")}</h2>
                <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("recruiterTrustReviewQueue.demoJourneyDesc")}</p>
                <p className="mt-4 text-sm font-medium text-[var(--twin-accent)]">{t("recruiterTrustReviewQueue.openTrustReviewQueue")} →</p>
              </Card>
            </Link>
          </>
        ) : null}
        {!SHOW_RECRUITER_HUB_PRIMARY_PROMOS && SHOW_RECRUITER_HUB_ROADMAP_PROMOS_COLLAPSED ? (
          <details
            className="mt-6 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/30 p-4"
            data-recruiter-hub-roadmap-promos
          >
            <summary className="twin-link cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
              {t("productPolish.recruiterRoadmapPromosToggle")}
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={recruiterDailyCockpitHref()}
                data-testid={RECRUITER_DAILY_COCKPIT_MARKERS.hubPromo}
                className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 text-sm transition hover:border-[var(--twin-accent)]/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                  {t("productPolish.previewLabel")}
                </p>
                <p className="mt-2 font-medium text-[var(--foreground)]">{t("recruiterDailyCockpit.title")}</p>
                <p className="twin-muted mt-1 text-xs leading-relaxed">{t("recruiterDailyCockpit.lead")}</p>
              </Link>
              <Link
                href={recruiterTrustReviewQueueHref()}
                data-testid={RECRUITER_TRUST_REVIEW_QUEUE_MARKERS.hubPromo}
                className="rounded-lg border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 p-4 text-sm transition hover:border-[var(--twin-accent)]/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                  {t("productPolish.previewLabel")}
                </p>
                <p className="mt-2 font-medium text-[var(--foreground)]">{t("recruiterTrustReviewQueue.pageTitle")}</p>
                <p className="twin-muted mt-1 text-xs leading-relaxed">{t("recruiterTrustReviewQueue.demoJourneyDesc")}</p>
              </Link>
            </div>
          </details>
        ) : null}
        {!SHOW_RECRUITER_HUB_PRIMARY_PROMOS && SHOW_RECRUITER_HUB_NEXT_ACTION ? (
          <RecruiterHubNextAction />
        ) : null}
        <div className="mt-6">
          <SystemOfRecordNavigationHub
            persona="recruiter"
            titleKey="workspaceModules.recruiterHubTitle"
            leadKey="systemOfRecord.recruiterHubLead"
          />
        </div>
        <p className="twin-muted mt-8 text-sm">
          <Link href="/workspace" className="twin-link font-medium">
            {t("workspace.switchContext")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
