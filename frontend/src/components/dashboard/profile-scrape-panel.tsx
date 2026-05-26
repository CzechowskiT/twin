"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { InvestorRoadmapPanel } from "@/components/investor-roadmap-panel";
import { ScrapeRegistryCoverageHint } from "@/components/scrape-registry-coverage-hint";
import { ButtonCta, Card } from "@/components/ui";
import { stripRequestIdFromUserMessage } from "@/lib/api";

import type { DashboardProfile, DashboardUser } from "./dashboard-helpers";

type Props = {
  user: DashboardUser | null;
  profile: DashboardProfile | null | undefined;
  showScrapePanel: boolean;
  scraping: boolean;
  scrapePollActive: boolean;
  jobsTotal: number;
  error: string | null;
  onTriggerScrape: () => void;
  onOpenLinkedinOptimizer: () => void;
};

/**
 * "Signed in" + profile card with the optional scrape ops panel
 * nested below. Layout intentionally stacks profile + scrape because the
 * dashboard rail main area is narrow (~34rem at lg).
 */
export function ProfileScrapePanel({
  user,
  profile,
  showScrapePanel,
  scraping,
  scrapePollActive,
  jobsTotal,
  error,
  onTriggerScrape,
  onOpenLinkedinOptimizer,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card variant="accent">
      {/* Stack profile + scrape: rail main is ~34rem at lg while flex-row needs ~44rem+ (see twin-readable-measure). */}
      <div className="flex flex-col gap-6">
        <div className="min-w-0 twin-card-inset p-4 sm:p-5">
          {user && (
            <div className="min-w-0 max-w-full">
              <p className="twin-muted text-xs">{t("dashboard.signedInAs")}</p>
              {/* Inline whiteSpace/overflow so the address never wraps at hyphens (Tailwind alone was still breaking in narrow layouts). */}
              <p
                className="mt-0.5 max-w-full text-[10px] font-medium leading-tight tracking-tight text-[var(--foreground)] sm:text-[11px]"
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          )}
          {profile === null && (
            <div className="mt-4">
              <p className="twin-muted mb-3 text-sm">{t("dashboard.addProfileHint")}</p>
              <Link href="/profile" className="twin-btn-solid">
                {t("dashboard.setupProfile")}
              </Link>
            </div>
          )}
          {profile && (
            <div className="mt-4 border-t border-[var(--twin-border)] pt-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium leading-snug">{profile.name}</p>
                <Link href="/profile" className="twin-link shrink-0 text-sm">
                  {t("dashboard.edit")}
                </Link>
              </div>
              <p className="twin-muted mt-2 break-words text-sm leading-relaxed">{profile.skills.join(", ")}</p>
              <p className="twin-muted mt-2 break-words text-sm leading-relaxed">
                {profile.experience_years} {t("dashboard.years")}
                {profile.location ? ` · ${profile.location}` : ""}
                {profile.desired_salary
                  ? ` · ${profile.desired_salary.toLocaleString()} PLN/mo`
                  : ""}
              </p>
              <button
                type="button"
                className="twin-btn-secondary twin-touch-target mt-3 !w-auto px-3 py-1.5 text-xs"
                onClick={onOpenLinkedinOptimizer}
              >
                {t("careerAssistant.optimizeLinkedin")}
              </button>
            </div>
          )}
        </div>

        {showScrapePanel && (
          <div id="dashboard-scrape" className="twin-card-inset min-w-0 w-full p-4 sm:p-5">
            <p className="break-words text-xs font-bold uppercase tracking-wide text-[var(--twin-muted-strong)] sm:tracking-wider">
              {t("dashboard.twinScrapePanelTitle")}
            </p>
            <ButtonCta
              type="button"
              aria-label={t("dashboard.twinForYourJob")}
              onClick={onTriggerScrape}
              disabled={
                scraping ||
                user?.can_trigger_scrape === false ||
                user?.scrape_worker_ready === false
              }
              className="!mt-4 !whitespace-normal !rounded-full !py-3.5 !text-base !font-bold !leading-snug !tracking-tight !shadow-lg"
            >
              {scraping ? t("dashboard.twinForYourJobRunning") : t("dashboard.twinForYourJob")}
            </ButtonCta>
            {scrapePollActive ? (
              <p className="mt-3 text-sm font-medium text-[var(--twin-link)]" aria-live="polite">
                {t("dashboard.scrapeRefreshingBanner").replace("{n}", String(jobsTotal))}
              </p>
            ) : null}
            {user?.can_trigger_scrape === false ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {t("dashboard.scrapeConsentRequired")}
              </p>
            ) : user?.scrape_worker_ready === false ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {t("dashboard.scrapeWorkerNotReady")}
              </p>
            ) : null}
            {user?.can_trigger_scrape === true && user.mail_configured === false ? (
              <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{t("dashboard.mailNotConfiguredTitle")}</span>
                {" — "}
                {t("dashboard.mailNotConfiguredBody")}
              </p>
            ) : null}
            <p className="twin-muted mt-3 break-words text-xs leading-relaxed">{t("dashboard.twinForYourJobHint")}</p>
            <ScrapeRegistryCoverageHint />
            <p className="twin-muted mt-2 break-words text-[11px] leading-relaxed">
              {t("dashboard.scrapeAllHint")} {t("dashboard.keepApiOpen")}
            </p>
            <InvestorRoadmapPanel />
            {error ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {stripRequestIdFromUserMessage(error)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
