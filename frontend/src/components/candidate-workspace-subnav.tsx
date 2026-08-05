"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { candidateCalendarHref } from "@/lib/persona-access";
import { TRUST_CENTER_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
import { TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE } from "@/lib/seven-day-d2-candidate";

const navClass =
  "twin-workspace-subnav flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:gap-x-4";

const itemClass =
  "twin-link inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-1 text-sm";

type CandidateWorkspaceSubnavProps = {
  ariaLabel: string;
  onExportJson?: () => void;
  exportJsonBusy?: boolean;
};

/** Green-only account workspace links — no trust_center pilot module chrome. */
export function CandidateWorkspaceSubnav({
  ariaLabel,
  onExportJson,
  exportJsonBusy = false,
}: CandidateWorkspaceSubnavProps) {
  const { t } = useTranslation();

  return (
    <nav className={navClass} aria-label={ariaLabel} data-candidate-workspace-subnav-green-only>
      <Link href="/profile" className={itemClass}>
        {t("nav.profile")}
      </Link>
      <Link href="/dashboard/jobs" className={itemClass}>
        {t("nav.jobs")}
      </Link>
      <Link href="/dashboard/matches" className={itemClass}>
        {t("candidateMatchesPage.pageTitle")}
      </Link>
      <Link href="/dashboard/career" className={itemClass}>
        {t("dashboard.careerCompassLink")}
      </Link>
      <Link href="/dashboard/portfolio" className={itemClass}>
        {t("careerEvidence.portfolioTitle")}
      </Link>
      <Link href="/dashboard/application-studio" className={itemClass}>
        {t("applicationStudio.eyebrow")}
      </Link>
      <Link href="/dashboard/interview-decision" className={itemClass}>
        {t("interviewDecision.eyebrow")}
      </Link>
      <Link href="/dashboard/career-transition" className={itemClass}>
        {t("careerTransition.eyebrow")}
      </Link>
      <Link href="/dashboard/strategy" className={itemClass}>
        {t("careerStrategy.eyebrow")}
      </Link>
      <Link href="/dashboard/search-strategy" className={itemClass}>
        {t("searchStrategy.eyebrow")}
      </Link>
      <Link href="/dashboard/search-outcomes" className={itemClass}>
        {t("searchOutcomes.eyebrow")}
      </Link>
      <Link href="/dashboard/review-center" className={itemClass}>
        {t("reviewCenter.eyebrow")}
      </Link>
      <Link href="/dashboard/decision-journal" className={itemClass}>
        {t("decisionJournal.eyebrow")}
      </Link>
      <Link href="/dashboard/execution-calendar" className={itemClass}>
        {t("executionCalendar.eyebrow")}
      </Link>
      <Link href="/dashboard/history" className={itemClass}>
        {t("careerLifecycle.history")}
      </Link>
      <Link href="/dashboard/approvals" className={itemClass}>
        {t("careerLifecycle.approvals")}
      </Link>
      <Link href="/dashboard/privacy-center" className={itemClass}>
        {t("careerLifecycle.privacy")}
      </Link>
      <Link href="/dashboard/identity" className={itemClass}>
        {t("dashboard.identityLink")}
      </Link>
      <Link href={candidateCalendarHref()} className={itemClass}>
        {t("dashboard.calendarLink")}
      </Link>
      <Link href="/privacy" className={itemClass}>
        {t("profile.privacyPolicyLink")}
      </Link>
      {TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <Link href={TRUST_CENTER_ROADMAP_OUTSIDE_HREF} className={itemClass}>
          {t("profile.trustRoadmapLink")}
        </Link>
      ) : null}
      {onExportJson ? (
        <button
          type="button"
          className={`${itemClass} cursor-pointer border-0 bg-transparent p-0 font-[inherit] disabled:opacity-50`}
          disabled={exportJsonBusy}
          aria-label={t("dashboard.exportMyDataJsonAria")}
          onClick={() => onExportJson()}
        >
          {exportJsonBusy ? "…" : t("dashboard.exportMyDataJson")}
        </button>
      ) : null}
    </nav>
  );
}
