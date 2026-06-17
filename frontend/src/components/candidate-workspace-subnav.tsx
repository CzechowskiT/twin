"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { candidateCalendarHref } from "@/lib/persona-access";

const navClass =
  "twin-workspace-subnav flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:gap-x-4";

const itemClass =
  "twin-link inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-1 text-sm";

type CandidateWorkspaceSubnavProps = {
  ariaLabel: string;
  onExportJson?: () => void;
  exportJsonBusy?: boolean;
};

/** Account workspace links (profile, compass, billing, …) — one scrollable row like the site header. */
export function CandidateWorkspaceSubnav({
  ariaLabel,
  onExportJson,
  exportJsonBusy = false,
}: CandidateWorkspaceSubnavProps) {
  const { t } = useTranslation();

  return (
    <nav className={navClass} aria-label={ariaLabel}>
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
      <Link href="/dashboard/billing" className={itemClass}>
        {t("dashboard.billingLink")}
      </Link>
      <Link href="/dashboard/referrals" className={itemClass}>
        {t("dashboard.referralsLink")}
      </Link>
      <Link href="/dashboard/identity" className={itemClass}>
        {t("dashboard.identityLink")}
      </Link>
      <Link href="/dashboard/trust" className={itemClass}>
        {t("workspaceModules.candidateTrustCenterTitle")}
      </Link>
      <Link href={candidateCalendarHref()} className={itemClass}>
        {t("dashboard.calendarLink")}
      </Link>
      <Link href="/dashboard/settings/auto-apply" className={itemClass}>
        {t("dashboard.nightlyAutoApplyLink")}
      </Link>
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
