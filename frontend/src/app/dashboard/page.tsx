"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jobApplyActionsGuardFromReadiness } from "@/lib/job-apply-actions-guard";
import { useDashboardVerifiedReadiness } from "@/hooks/dashboard/use-dashboard-verified-readiness";
import { CandidateModuleNav } from "@/components/dashboard/candidate-module-nav";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { DailyCareerOsPanel } from "@/components/career/daily-career-os-panel";
import { PilotHomeNextAction } from "@/components/dashboard/pilot-home-next-action";
import { GuidedFirstValueEntry } from "@/components/dashboard/guided-first-value-entry";
import { CanaryFirstValuePanel } from "@/components/dashboard/canary-first-value-panel";
import { PathReadinessPanel } from "@/components/dashboard/path-readiness-panel";
import { JourneyContinuityPanel } from "@/components/dashboard/journey-continuity-panel";
import { WorkspaceHandoffBanner } from "@/components/candidate/workspace-handoff-banner";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";
import { LifecycleCommandPanel } from "@/components/lifecycle/lifecycle-command-panel";
import { ProfileCompletenessHint } from "@/components/ux/profile-completeness-hint";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { WorkspaceQuickActions } from "@/components/workspace/workspace-quick-actions";
import { isCalendarConnected } from "@/lib/dashboard-next-best-action";
import { SHOW_DASHBOARD_EXTENDED_HOME_MODULES, SHOW_DASHBOARD_AUTO_APPLY_STRIP } from "@/lib/product-polish-p0";
import { SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME } from "@/lib/product-polish-p4";
import { SHOW_SCRAPE_UI } from "@/lib/features";

import { ApplicationsSection } from "@/components/dashboard/applications-section";
import { CareerCompassStrip } from "@/components/dashboard/career-compass-strip";
import { DashboardCalendarStrip } from "@/components/dashboard/dashboard-calendar-strip";
import { DevelopmentFocusSection } from "@/components/dashboard/development-focus-section";
import { JobsSection } from "@/components/dashboard/jobs-section";
import { MatchesSection } from "@/components/dashboard/matches-section";
import { DashboardVerifiedReadinessCard } from "@/components/dashboard/dashboard-verified-readiness-card";
import { ProfileScrapePanel } from "@/components/dashboard/profile-scrape-panel";
import { NightlyAutoApplyStrip } from "@/components/nightly-auto-apply-strip";
import { useDashboardApplicationActions } from "@/hooks/dashboard/use-dashboard-application-actions";
import { useDashboardCalendarActions } from "@/hooks/dashboard/use-dashboard-calendar-actions";
import { useDashboardData } from "@/hooks/dashboard/use-dashboard-data";
import { useDashboardExports } from "@/hooks/dashboard/use-dashboard-exports";
import { useDashboardJobApplicationActions } from "@/hooks/dashboard/use-dashboard-job-application-actions";
import { useDashboardJobListActions } from "@/hooks/dashboard/use-dashboard-job-list-actions";
import { useDashboardMatchFeedback } from "@/hooks/dashboard/use-dashboard-match-feedback";
import { useDashboardModals } from "@/hooks/dashboard/use-dashboard-modals";
import { useDashboardPolling } from "@/hooks/dashboard/use-dashboard-polling";
import { useRouter } from "next/navigation";

const DashboardTutorial = dynamic(
  () => import("@/components/dashboard/dashboard-tutorial").then((m) => m.DashboardTutorial),
  { ssr: false },
);
const FeedbackModal = dynamic(
  () => import("@/components/feedback/feedback-modal").then((m) => m.FeedbackModal),
  { ssr: false },
);
const HelpWidget = dynamic(
  () => import("@/components/help/help-widget").then((m) => m.HelpWidget),
  { ssr: false },
);
const DashboardModals = dynamic(
  () => import("@/components/dashboard/dashboard-modals").then((m) => m.DashboardModals),
  { ssr: false },
);

const DASHBOARD_CORE_QUICK_ACTIONS = [
  { href: "/dashboard/jobs", labelKey: "workspaceModules.candidateJobsCta" as const },
  { href: "/dashboard/matches", labelKey: "workspaceModules.candidateMatchesCta" as const },
  { href: "/dashboard/applications", labelKey: "workspaceModules.candidateApplicationsCta" as const },
  { href: "/dashboard/calendar", labelKey: "workspaceModules.candidateCalendarCta" as const },
  { href: "/profile", labelKey: "workspaceModules.candidateProfileCta" as const },
] as const;
const OpportunityForecast = dynamic(
  () => import("@/components/dashboard/OpportunityForecast").then((m) => m.OpportunityForecast),
  { ssr: false },
);
const ProgressDashboard = dynamic(
  () => import("@/components/dashboard/ProgressDashboard").then((m) => m.ProgressDashboard),
  { ssr: false },
);

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const data = useDashboardData(t);
  const verifiedReadiness = useDashboardVerifiedReadiness();
  const applyActionsGuard = useMemo(
    () =>
      jobApplyActionsGuardFromReadiness(
        verifiedReadiness.gate,
        verifiedReadiness.loadState,
      ),
    [verifiedReadiness.gate, verifiedReadiness.loadState],
  );
  const {
    user,
    profile,
    matches,
    setMatches,
    jobs,
    setJobs,
    feedStats,
    applications,
    applicationsTotal,
    devFocus,
    setDevFocus,
    filterOptions,
    filters,
    setFilters,
    error,
    setError,
    savedJobIds,
    setSavedJobIds,
    dashboardCalendarBundle,
    lastUpdated,
    matchesRefreshing,
    dashboardBootstrapping,
    matchFeedbackByJobId,
    setMatchFeedbackByJobId,
    matchFeedbackBusyJobId,
    setMatchFeedbackBusyJobId,
    placementEventsInvalidateKey,
    bumpPlacementEventsInvalidateKey,
    dashboardWebcalUrl,
    setDashboardWebcalUrl,
    applicationByJobId,
    displayApplicationStatus,
    loadJobs,
    loadApplications,
    loadDevelopmentFocus,
    syncApplicationsFromApi,
    refreshDashboardData,
    applyJobFilters,
  } = data;

  const exports = useDashboardExports({ t, setError });
  const polling = useDashboardPolling({
    t,
    router,
    refreshDashboardData,
    setError,
    setFilters,
  });
  const applicationActions = useDashboardApplicationActions({
    t,
    setError,
    loadApplications,
    loadDevelopmentFocus,
    syncApplicationsFromApi,
    setDevFocus,
    bumpPlacementEventsInvalidateKey,
  });
  const {
    feedbackBusy,
    placementFlowBusy,
    updateApplicationStatus,
    removeApplication,
    saveApplicationFeedback,
    parseApplicationFeedback,
    openAutoApplyPackagePdf,
    declarePlacement,
    issuePlacementEmployerAttest,
    filePlacementDispute,
    startPlacementVerify,
    loadPlacementEvents,
  } = applicationActions;
  const calendarActions = useDashboardCalendarActions({
    t,
    setError,
    setDashboardWebcalUrl,
  });
  const {
    calendarConnectBusy,
    dashboardWebcalBusy,
    nextInterviewIcsBusy,
    setNextInterviewIcsBusy,
    connectGoogleCalendarFromDashboard,
    connectMicrosoftCalendarFromDashboard,
    subscribeDashboardWebcalOneClick,
    refreshDashboardWebcalLink,
  } = calendarActions;

  const modals = useDashboardModals();

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const trackLinkOpenedRef = useRef<((jobId: number) => void | Promise<void>) | null>(null);

  const {
    autoApplyingId,
    setJobApplication,
    applyToJob,
    autoApplyToJob: autoApplyToJobRaw,
  } = useDashboardJobApplicationActions({
    t,
    setError,
    loadApplications,
    loadDevelopmentFocus,
    syncApplicationsFromApi,
    setDevFocus,
    trackLinkOpenedRef,
  });

  const {
    jobsLoadMoreBusy,
    loadMoreJobs,
    trackLinkOpened,
    saveJob,
    dismissJob,
  } = useDashboardJobListActions({
    t,
    setError,
    jobs,
    setJobs,
    filters,
    loadJobs,
    savedJobIds,
    setSavedJobIds,
    applicationByJobId,
    setJobApplication,
    loadApplications,
    loadDevelopmentFocus,
    syncApplicationsFromApi,
    setDevFocus,
  });

  useEffect(() => {
    trackLinkOpenedRef.current = trackLinkOpened;
  }, [trackLinkOpened]);

  const autoApplyToJob = useCallback(
    (jobId: number) => {
      if (!applyActionsGuard.canPrepareApplicationPackage) {
        setError(t("dashboard.prepareApplicationBlocked"));
        return;
      }
      void autoApplyToJobRaw(jobId);
    },
    [applyActionsGuard.canPrepareApplicationPackage, autoApplyToJobRaw, setError, t],
  );

  const {
    submitMatchFeedback,
    visibleMatches,
    topHighlightMatches,
    moreRecommendationMatches,
  } = useDashboardMatchFeedback({
    t,
    setError,
    matches,
    setMatches,
    applicationByJobId,
    setMatchFeedbackByJobId,
    setMatchFeedbackBusyJobId,
  });

  const developmentFocusHasData = useMemo(() => {
    if (!devFocus) return false;
    return (
      devFocus.skill_tool_gaps.length > 0 ||
      devFocus.positioning_themes.length > 0 ||
      devFocus.stronger_candidate_signals.length > 0 ||
      devFocus.upskill_actions_prioritized.length > 0 ||
      devFocus.roles_with_insights.length > 0
    );
  }, [devFocus]);

  const hasProfile = profile !== null && profile !== undefined;

  const pipelineActiveCount = useMemo(
    () => applications.filter((a) => a.status !== "rejected").length,
    [applications],
  );

  const todayContext = useMemo(
    () => ({
      hasProfile,
      visibleMatchesCount: hasProfile ? visibleMatches.length : 0,
      pipelineActiveCount: hasProfile ? pipelineActiveCount : 0,
      calendarConnected: isCalendarConnected(
        dashboardCalendarBundle?.google?.connected,
        dashboardCalendarBundle?.microsoft?.connected,
      ),
    }),
    [
      hasProfile,
      visibleMatches.length,
      pipelineActiveCount,
      dashboardCalendarBundle?.google?.connected,
      dashboardCalendarBundle?.microsoft?.connected,
    ],
  );
  const matchesInitialSkeleton = hasProfile && matches === null && matchesRefreshing;
  const showScrapePanel = SHOW_SCRAPE_UI && user?.scrape_ops_elevated === true;

  if (dashboardBootstrapping) {
    return (
      <Shell wide rail>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--twin-accent)] border-t-transparent"
            aria-hidden
          />
          <p className="twin-muted text-sm">{t("dashboard.loadingJobs")}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      wide
      rail
      pageMomentumRailProps={{
        dashboardStats: {
          jobsTotal: jobs?.total ?? 0,
          matchesTotal: hasProfile ? matches?.total ?? null : null,
          matchesVisible: hasProfile ? visibleMatches.length : 0,
          applicationsTotal: hasProfile ? applications.length : 0,
          pipelineActive: hasProfile ? pipelineActiveCount : 0,
          hasProfile,
        },
      }}
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h1 className="twin-page-intro twin-section-title shrink-0 text-xl sm:text-2xl">
          {t("dashboard.title")}
        </h1>
        <CandidateWorkspaceSubnav
          ariaLabel={t("dashboard.title")}
          exportJsonBusy={exports.exportJsonBusy}
          onExportJson={() => void exports.downloadMyDataJson()}
        />
      </div>

      <WorkspaceFlowSteps current="dashboard" className="mb-4 sm:mb-6" />
      <CandidateModuleNav />
      <ProfileCompletenessHint profile={profile} />
      {user ? (
        <DashboardVerifiedReadinessCard
          gate={verifiedReadiness.gate}
          loadState={verifiedReadiness.loadState}
        />
      ) : null}

      {user ? <EmailVerificationBanner /> : null}
      {user && SHOW_DASHBOARD_AUTO_APPLY_STRIP ? <NightlyAutoApplyStrip /> : null}

      {user ? (
        SHOW_DASHBOARD_EXTENDED_HOME_MODULES ? (
          <div className="dashboard-hero-grid mb-4 sm:mb-6">
            <div className="dashboard-hero-grid__welcome">
              <DashboardCommandCenter
                email={user.email}
                profileName={profile ? profile.name : undefined}
                hasProfile={hasProfile}
                showScrapeUi={showScrapePanel}
                todayContext={todayContext}
              />
              <GuidedFirstValueEntry />
              <CanaryFirstValuePanel />
              <JourneyContinuityPanel />
              <WorkspaceHandoffBanner expectedDestRouteKey="path_home" />
              <PathReadinessPanel />
              <IaActionableEmpty areaId="home" show />
              <PilotHomeNextAction />
              <DailyCareerOsPanel compact />
              <LifecycleCommandPanel />
            </div>
            <div className="dashboard-hero-grid__insights">
              <ProgressDashboard />
            </div>
          </div>
        ) : (
          <>
            <DashboardCommandCenter
              email={user.email}
              profileName={profile ? profile.name : undefined}
              hasProfile={hasProfile}
              showScrapeUi={showScrapePanel}
              todayContext={todayContext}
            />
            <GuidedFirstValueEntry />
            <CanaryFirstValuePanel />
            <JourneyContinuityPanel />
            <WorkspaceHandoffBanner expectedDestRouteKey="path_home" />
            <PathReadinessPanel />
            <IaActionableEmpty areaId="home" show />
            <PilotHomeNextAction />
            <DailyCareerOsPanel compact />
            <div className="mb-4 sm:mb-6">
              <LifecycleCommandPanel />
            </div>
            <div className="mb-4 sm:mb-6" aria-label={t("dashboard.coreLinksAria")}>
              <WorkspaceQuickActions actions={DASHBOARD_CORE_QUICK_ACTIONS} />
            </div>
          </>
        )
      ) : null}

      {user && SHOW_DASHBOARD_EXTENDED_HOME_MODULES ? (
        <>
          <div className="mb-4 min-w-0 sm:mb-6">
            <OpportunityForecast applyActionsGuard={applyActionsGuard} />
          </div>
          <DashboardCalendarStrip
            bundle={dashboardCalendarBundle}
            calendarConnectBusy={calendarConnectBusy}
            onConnectGoogle={() => void connectGoogleCalendarFromDashboard()}
            onConnectMicrosoft={() => void connectMicrosoftCalendarFromDashboard()}
            webcalUrl={dashboardWebcalUrl}
            webcalBusy={dashboardWebcalBusy}
            onWebcalOneClick={() => void subscribeDashboardWebcalOneClick()}
            onWebcalRefresh={() => void refreshDashboardWebcalLink()}
            nextInterviewIcsBusy={nextInterviewIcsBusy}
            setNextInterviewIcsBusy={setNextInterviewIcsBusy}
          />
        </>
      ) : null}

      {user ? (
        <p
          className={`twin-muted max-w-prose text-sm leading-relaxed ${
            SHOW_DASHBOARD_EXTENDED_HOME_MODULES ? "-mt-2 mb-4" : "mb-4 sm:mb-6"
          }`}
        >
          {t("dashboard.northStarLead")}
        </p>
      ) : null}

      {(() => {
        const extendedModules = (
          <>
            {SHOW_CAREER_COMPASS_ON_DASHBOARD_HOME && hasProfile && profile ? (
              <CareerCompassStrip profile={profile} />
            ) : null}

            {showScrapePanel ? (
              <ProfileScrapePanel
                user={user}
                profile={profile}
                showScrapePanel={showScrapePanel}
                scraping={polling.scraping}
                scrapePollActive={polling.scrapePollActive}
                jobsTotal={jobs?.total ?? 0}
                error={error}
                onTriggerScrape={() =>
                  void polling.triggerScrapeAll({
                    hasProfile,
                    filters,
                    jobsTotal: jobs?.total ?? 0,
                  })
                }
                onOpenLinkedinOptimizer={modals.openLinkedin}
              />
            ) : null}

            {hasProfile && (matchesInitialSkeleton || matches !== null) ? (
              <MatchesSection
                matches={matches}
                matchesInitialSkeleton={matchesInitialSkeleton}
                visibleMatches={visibleMatches}
                topHighlightMatches={topHighlightMatches}
                moreRecommendationMatches={moreRecommendationMatches}
                matchFeedbackByJobId={matchFeedbackByJobId}
                matchFeedbackBusyJobId={matchFeedbackBusyJobId}
                displayApplicationStatus={displayApplicationStatus}
                autoApplyingId={autoApplyingId}
                applyActionsGuard={applyActionsGuard}
                matchesCsvBusy={exports.matchesCsvBusy}
                matchesXlsxBusy={exports.matchesXlsxBusy}
                showApplyPrompt={polling.showApplyPrompt}
                onSubmitFeedback={(jobId, value) => void submitMatchFeedback(jobId, value)}
                onApply={applyToJob}
                onAutoApply={autoApplyToJob}
                onSave={saveJob}
                onDismiss={dismissJob}
                onResearch={modals.openIntel}
                onHiringInsights={modals.openInsights}
                onViewEmployer={modals.openEmployerHub}
                onDownloadCsv={() => void exports.downloadMatchesCsv()}
                onDownloadXlsx={() => void exports.downloadMatchesXlsx()}
                onApplyPromptDismiss={() => polling.setShowApplyPrompt(false)}
                onApplyPromptOpenFirst={() => {
                  polling.setShowApplyPrompt(false);
                  const first = visibleMatches[0];
                  if (first) window.open(first.url, "_blank", "noopener,noreferrer");
                }}
              />
            ) : null}

            {hasProfile ? (
              <DevelopmentFocusSection devFocus={devFocus} hasData={developmentFocusHasData} />
            ) : null}

            {hasProfile ? (
              <ApplicationsSection
                applications={applications}
                applicationsTotal={applicationsTotal}
                applicationsCsvBusy={exports.applicationsCsvBusy}
                applicationsXlsxBusy={exports.applicationsXlsxBusy}
                feedbackBusy={feedbackBusy}
                placementFlowBusy={placementFlowBusy}
                placementEventsInvalidateKey={placementEventsInvalidateKey}
                onDownloadCsv={() => void exports.downloadApplicationsCsv()}
                onDownloadXlsx={() => void exports.downloadApplicationsXlsx()}
                onStatusChange={updateApplicationStatus}
                onRemove={removeApplication}
                onSaveFeedback={saveApplicationFeedback}
                onParseFeedback={parseApplicationFeedback}
                onPlacementDeclare={declarePlacement}
                onPlacementVerifyStart={startPlacementVerify}
                onPlacementEmployerAttest={issuePlacementEmployerAttest}
                onPlacementDispute={filePlacementDispute}
                onPlacementEventsLoad={loadPlacementEvents}
                onOpenAutoApplyPackage={openAutoApplyPackagePdf}
                onOptimizeCv={modals.openCv}
                onNegotiateSalary={modals.openNegotiate}
              />
            ) : null}

            {lastUpdated ? (
              <p className="twin-muted mb-4 text-xs">
                {t("dashboard.lastUpdated")}{" "}
                {lastUpdated.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            ) : null}

            <JobsSection
              jobs={jobs}
              feedStats={feedStats}
              filters={filters}
              filterOptions={filterOptions}
              hasProfile={hasProfile}
              displayApplicationStatus={displayApplicationStatus}
              autoApplyingId={autoApplyingId}
              applyActionsGuard={applyActionsGuard}
              jobsLoadMoreBusy={jobsLoadMoreBusy}
              onFiltersChange={setFilters}
              onApplyFilters={() => void applyJobFilters()}
              onLoadMore={() => void loadMoreJobs()}
              setFilters={setFilters}
              onApply={applyToJob}
              onAutoApply={autoApplyToJob}
              onSave={saveJob}
              onDismiss={dismissJob}
              onResearch={modals.openIntel}
              onHiringInsights={modals.openInsights}
              onViewEmployer={modals.openEmployerHub}
            />
          </>
        );

        if (SHOW_DASHBOARD_EXTENDED_HOME_MODULES) return extendedModules;

        return (
          <details className="mb-6 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/30 p-4" data-dashboard-extended-modules>
            <summary className="twin-link cursor-pointer text-sm font-medium [&::-webkit-details-marker]:hidden">
              {t("dashboard.extendedModulesToggle")}
            </summary>
            <div className="mt-4 space-y-4">{extendedModules}</div>
          </details>
        );
      })()}

      <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[var(--twin-border)] pt-5 text-sm text-[var(--twin-muted-strong)]">
        <button type="button" className="twin-link" onClick={() => setFeedbackOpen(true)}>
          {t("feedback.title")}
        </button>
        <Link href="/privacy" className="twin-link">
          {t("dashboard.footerPrivacy")}
        </Link>
        <Link href="/terms" className="twin-link">
          {t("dashboard.footerTerms")}
        </Link>
      </footer>
      <DashboardTutorial onOpenFeedback={() => setFeedbackOpen(true)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <DashboardModals
        intelJob={modals.intelJob}
        onCloseIntel={modals.closeIntel}
        insightsJob={modals.insightsJob}
        onCloseInsights={modals.closeInsights}
        employerHubJob={modals.employerHubJob}
        onCloseEmployerHub={modals.closeEmployerHub}
        cvApp={modals.cvApp}
        onCloseCv={modals.closeCv}
        negotiateApp={modals.negotiateApp}
        onCloseNegotiate={modals.closeNegotiate}
        linkedinOpen={modals.linkedinOpen}
        onCloseLinkedin={modals.closeLinkedin}
        linkedinDefaultRole={profile?.preferred_job_titles?.[0] ?? ""}
      />
      <HelpWidget />
    </Shell>
  );
}
