"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  type ApplicationRow,
  type FeedbackBusy,
  type PlacementEventRow,
  type PlacementFlowBusy,
} from "@/components/applications-panel";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { OpportunityForecast } from "@/components/dashboard/OpportunityForecast";
import { ProgressDashboard } from "@/components/dashboard/ProgressDashboard";
import { ProfileCompletenessHint } from "@/components/ux/profile-completeness-hint";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { NightlyAutoApplyStrip } from "@/components/nightly-auto-apply-strip";
import { DashboardTutorial } from "@/components/dashboard/dashboard-tutorial";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { HelpWidget } from "@/components/help/help-widget";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  MAIN_RECOMMENDATION_MIN_SCORE,
  TOP_MATCHES_HIGHLIGHT_COUNT,
  type MatchFeedbackValue,
} from "@/lib/matching-quality";
import { SHOW_SCRAPE_UI } from "@/lib/features";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";
import { JOB_FEED_PAGE_MAX } from "@/lib/jobs";
import {
  mintAndOpenWebcalSubscribe,
  mintWebcalFeed,
  persistWebcalUrl,
} from "@/lib/webcal-subscribe";

import { ApplicationsSection } from "@/components/dashboard/applications-section";
import { CareerCompassStrip } from "@/components/dashboard/career-compass-strip";
import { DashboardCalendarStrip } from "@/components/dashboard/dashboard-calendar-strip";
import { DashboardModals } from "@/components/dashboard/dashboard-modals";
import { DevelopmentFocusSection } from "@/components/dashboard/development-focus-section";
import { JobsSection } from "@/components/dashboard/jobs-section";
import { MatchesSection } from "@/components/dashboard/matches-section";
import { ProfileScrapePanel } from "@/components/dashboard/profile-scrape-panel";
import { dashboardFetchUserMessage } from "@/components/dashboard/dashboard-helpers";
import { useDashboardData } from "@/hooks/dashboard/use-dashboard-data";
import { useDashboardExports } from "@/hooks/dashboard/use-dashboard-exports";
import { useDashboardPolling } from "@/hooks/dashboard/use-dashboard-polling";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const data = useDashboardData(t);
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

  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackBusy>(null);
  const [placementFlowBusy, setPlacementFlowBusy] = useState<PlacementFlowBusy>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [autoApplyingId, setAutoApplyingId] = useState<number | null>(null);
  const [intelJob, setIntelJob] = useState<{
    id: number;
    title: string;
    company: string;
    location: string | null;
  } | null>(null);
  const [insightsJob, setInsightsJob] = useState<{ id: number; title: string } | null>(null);
  const [employerHubJob, setEmployerHubJob] = useState<{
    id: number;
    title: string;
    company: string;
    location: string | null;
    url?: string;
    initialTab?: JobEmployerTabId;
  } | null>(null);
  const [cvApp, setCvApp] = useState<{ id: number; title: string } | null>(null);
  const [negotiateApp, setNegotiateApp] = useState<{ id: number; title: string } | null>(null);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [nextInterviewIcsBusy, setNextInterviewIcsBusy] = useState(false);
  const [dashboardWebcalBusy, setDashboardWebcalBusy] = useState(false);
  const [calendarConnectBusy, setCalendarConnectBusy] = useState<"google" | "microsoft" | null>(null);
  const [jobsLoadMoreBusy, setJobsLoadMoreBusy] = useState(false);

  async function loadMoreJobs() {
    const token = getToken();
    if (!token || jobs === null) return;
    if (jobs.items.length >= jobs.total) return;
    setJobsLoadMoreBusy(true);
    setError(null);
    try {
      const page = await loadJobs(token, filters, {
        skip: jobs.items.length,
        limit: JOB_FEED_PAGE_MAX,
      });
      setJobs((prev) => {
        if (!prev) return page;
        const seen = new Set(prev.items.map((j) => j.id));
        const merged = [...prev.items];
        for (const row of page.items) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return { total: page.total, items: merged };
      });
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setJobsLoadMoreBusy(false);
    }
  }

  async function setJobApplication(jobId: number, status: string) {
    const token = getToken();
    if (!token) return;
    try {
      const idem =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "";
      const h = new Headers();
      if (idem) h.set("Idempotency-Key", idem);
      await apiFetch(
        "/api/v1/applications/",
        {
          method: "POST",
          body: JSON.stringify({ job_id: jobId, status }),
          headers: h,
        },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      if (status === "applied") {
        toast.success(t("dashboard.applicationTrackedAppliedToast"));
      }
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    }
  }

  async function trackLinkOpened(jobId: number) {
    const token = getToken();
    if (!token) return;
    try {
      const idem =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "";
      const h = new Headers();
      if (idem) h.set("Idempotency-Key", idem);
      await apiFetch(
        "/api/v1/applications/",
        {
          method: "POST",
          body: JSON.stringify({ job_id: jobId, status: "pending", track_link_opened: true }),
          headers: h,
        },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      toast.success(t("dashboard.applicationTrackedLinkToast"));
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    }
  }

  function applyToJob(jobId: number, url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    void trackLinkOpened(jobId);
  }

  function saveJob(jobId: number) {
    const token = getToken();
    if (!token) return;
    void (async () => {
      try {
        await apiFetch(`/api/v1/jobs/saved/${jobId}`, { method: "POST" }, token);
        setSavedJobIds((prev) => new Set(prev).add(jobId));
        toast.success(t("dashboard.jobBookmarkedToast"));
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
        toast.error(t("dashboard.jobBookmarkFailedToast"));
      }
    })();
  }

  function dismissJob(jobId: number) {
    const token = getToken();
    if (!token) return;
    const statusForJob = applicationByJobId[jobId];
    if (savedJobIds.has(jobId) && !statusForJob) {
      void (async () => {
        try {
          await apiFetch(`/api/v1/jobs/saved/${jobId}`, { method: "DELETE" }, token);
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
          toast.success(t("dashboard.jobRemovedToast"));
        } catch (err) {
          setError(dashboardFetchUserMessage(err, t));
          toast.error(t("dashboard.jobRemoveFailedToast"));
        }
      })();
      return;
    }
    void setJobApplication(jobId, "rejected");
  }

  async function autoApplyToJob(jobId: number) {
    const token = getToken();
    if (!token) return;
    setAutoApplyingId(jobId);
    setError(null);
    try {
      const result = await apiFetch<{
        success: boolean;
        message: string;
        package_pdf_url?: string | null;
      }>(
        "/api/v1/applications/auto-apply",
        { method: "POST", body: JSON.stringify({ job_id: jobId, human_acknowledged: true }) },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      toast.success(result.message);
      if (result.package_pdf_url) {
        window.open(result.package_pdf_url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setAutoApplyingId(null);
    }
  }

  async function openAutoApplyPackagePdf(applicationId: number) {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const data = await apiFetch<{ url: string }>(
        `/api/v1/applications/${applicationId}/auto-apply-package-url`,
        {},
        token,
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
      toast.error(t("dashboard.autoApplyPackagePdfFailedToast"));
    }
  }

  const visibleMatches = useMemo(() => {
    const items = matches?.items ?? [];
    return items.filter(
      (job) =>
        applicationByJobId[job.job_id] !== "rejected" &&
        (job.score ?? 0) >= MAIN_RECOMMENDATION_MIN_SCORE,
    );
  }, [matches?.items, applicationByJobId]);

  const topHighlightMatches = useMemo(
    () => visibleMatches.slice(0, TOP_MATCHES_HIGHLIGHT_COUNT),
    [visibleMatches],
  );

  const moreRecommendationMatches = useMemo(
    () => visibleMatches.slice(TOP_MATCHES_HIGHLIGHT_COUNT),
    [visibleMatches],
  );

  async function submitMatchFeedback(jobId: number, value: MatchFeedbackValue) {
    const token = getToken();
    if (!token) return;
    setMatchFeedbackBusyJobId(jobId);
    try {
      await apiFetch(
        "/api/v1/candidates/me/match-feedback",
        { method: "POST", body: JSON.stringify({ job_id: jobId, feedback_value: value }) },
        token,
      );
      setMatchFeedbackByJobId((prev) => ({ ...prev, [jobId]: value }));
      toast.success(t("dashboard.matchFeedbackSaved"));
      if (value === "not_relevant") {
        setMatches((prev) =>
          prev
            ? { ...prev, items: prev.items.filter((m) => m.job_id !== jobId), total: Math.max(0, prev.total - 1) }
            : prev,
        );
      }
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setMatchFeedbackBusyJobId(null);
    }
  }

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

  async function updateApplicationStatus(id: number, status: string) {
    const token = getToken();
    if (!token) return;
    await apiFetch(
      `/api/v1/applications/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      token,
    );
    syncApplicationsFromApi(await loadApplications(token));
    setDevFocus(await loadDevelopmentFocus(token));
  }

  async function removeApplication(id: number) {
    const token = getToken();
    if (!token) return;
    await apiFetch(`/api/v1/applications/${id}`, { method: "DELETE" }, token);
    syncApplicationsFromApi(await loadApplications(token));
    setDevFocus(await loadDevelopmentFocus(token));
  }

  async function saveApplicationFeedback(id: number, raw: string) {
    const token = getToken();
    if (!token) return;
    setFeedbackBusy({ id, kind: "save" });
    setError(null);
    try {
      await apiFetch(
        `/api/v1/applications/${id}`,
        { method: "PATCH", body: JSON.stringify({ recruiter_feedback_raw: raw }) },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setFeedbackBusy(null);
    }
  }

  async function parseApplicationFeedback(id: number) {
    const token = getToken();
    if (!token) return;
    setFeedbackBusy({ id, kind: "parse" });
    setError(null);
    try {
      await apiFetch(`/api/v1/applications/${id}/parse-feedback`, { method: "POST", body: "{}" }, token);
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setFeedbackBusy(null);
    }
  }

  async function connectGoogleCalendarFromDashboard() {
    const token = getToken();
    if (!token) return;
    setCalendarConnectBusy("google");
    setError(null);
    try {
      const res = await apiFetch<{ authorize_url: string }>("/api/v1/calendar/google/authorize", {}, token);
      window.location.href = res.authorize_url;
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setCalendarConnectBusy(null);
    }
  }

  async function connectMicrosoftCalendarFromDashboard() {
    const token = getToken();
    if (!token) return;
    setCalendarConnectBusy("microsoft");
    setError(null);
    try {
      const res = await apiFetch<{ authorize_url: string }>("/api/v1/calendar/microsoft/authorize", {}, token);
      window.location.href = res.authorize_url;
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setCalendarConnectBusy(null);
    }
  }

  async function subscribeDashboardWebcalOneClick() {
    const token = getToken();
    if (!token) return;
    setDashboardWebcalBusy(true);
    try {
      const out = await mintAndOpenWebcalSubscribe(token);
      setDashboardWebcalUrl(out.webcal_url);
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setDashboardWebcalBusy(false);
    }
  }

  async function refreshDashboardWebcalLink() {
    const token = getToken();
    if (!token) return;
    setDashboardWebcalBusy(true);
    try {
      const out = await mintWebcalFeed(token);
      setDashboardWebcalUrl(out.webcal_url);
      persistWebcalUrl(out.webcal_url);
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setDashboardWebcalBusy(false);
    }
  }

  async function declarePlacement(applicationId: number, note: string) {
    const token = getToken();
    if (!token) return;
    setPlacementFlowBusy({ id: applicationId, kind: "declare" });
    setError(null);
    try {
      await apiFetch<ApplicationRow>(
        `/api/v1/applications/${applicationId}/placement-declare`,
        { method: "POST", body: JSON.stringify({ note: note.trim() || null }) },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      bumpPlacementEventsInvalidateKey();
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setPlacementFlowBusy(null);
    }
  }

  async function issuePlacementEmployerAttest(
    applicationId: number,
    employerEmail?: string,
  ): Promise<string> {
    const token = getToken();
    if (!token) throw new Error(t("dashboard.placementEventsNotSignedIn"));
    setPlacementFlowBusy({ id: applicationId, kind: "employer_attest" });
    setError(null);
    try {
      const out = await apiFetch<{ attest_url: string; mail_sent: boolean }>(
        `/api/v1/applications/${applicationId}/placement-employer-attest-link`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(employerEmail?.trim() ? { employer_email: employerEmail.trim() } : {}),
          }),
        },
        token,
      );
      bumpPlacementEventsInvalidateKey();
      toast.success(
        out.mail_sent
          ? t("dashboard.placementEmployerAttestEmailed")
          : t("dashboard.placementEmployerAttestCopied"),
      );
      return out.attest_url;
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
      throw err;
    } finally {
      setPlacementFlowBusy(null);
    }
  }

  async function filePlacementDispute(applicationId: number, reason: string) {
    const token = getToken();
    if (!token) return;
    setPlacementFlowBusy({ id: applicationId, kind: "dispute" });
    setError(null);
    try {
      await apiFetch<ApplicationRow>(
        `/api/v1/applications/${applicationId}/placement-dispute`,
        { method: "POST", body: JSON.stringify({ reason: reason.trim() || null }) },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      bumpPlacementEventsInvalidateKey();
      toast.success(t("dashboard.placementDisputed"));
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setPlacementFlowBusy(null);
    }
  }

  async function startPlacementVerify(applicationId: number, workEmail: string) {
    const token = getToken();
    if (!token) return;
    setPlacementFlowBusy({ id: applicationId, kind: "verify" });
    setError(null);
    try {
      const out = await apiFetch<{ mail_sent: boolean; message: string }>(
        `/api/v1/applications/${applicationId}/placement-verify/start`,
        { method: "POST", body: JSON.stringify({ work_email: workEmail }) },
        token,
      );
      syncApplicationsFromApi(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      alert(out.message || t("dashboard.placementVerifyPending"));
      bumpPlacementEventsInvalidateKey();
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setPlacementFlowBusy(null);
    }
  }

  async function loadPlacementEvents(applicationId: number) {
    const token = getToken();
    if (!token) throw new Error(t("dashboard.placementEventsNotSignedIn"));
    const data = await apiFetch<{ items: PlacementEventRow[]; total: number }>(
      `/api/v1/applications/${applicationId}/placement-events`,
      {},
      token,
    );
    return data.items;
  }

  const pipelineActiveCount = useMemo(
    () => applications.filter((a) => a.status !== "rejected").length,
    [applications],
  );

  const hasProfile = profile !== null && profile !== undefined;
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
      <ProfileCompletenessHint profile={profile} />

      {user ? <EmailVerificationBanner /> : null}
      {user ? <NightlyAutoApplyStrip /> : null}

      {user ? (
        <>
          <DashboardCommandCenter
            email={user.email}
            profileName={profile ? profile.name : undefined}
            hasProfile={hasProfile}
            showScrapeUi={showScrapePanel}
          />
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <OpportunityForecast />
            <ProgressDashboard />
          </div>
          <p className="twin-muted -mt-2 mb-4 max-w-prose text-sm leading-relaxed">{t("dashboard.northStarLead")}</p>
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

      {hasProfile && profile ? <CareerCompassStrip profile={profile} /> : null}

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
        onOpenLinkedinOptimizer={() => setLinkedinOpen(true)}
      />

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
          matchesCsvBusy={exports.matchesCsvBusy}
          matchesXlsxBusy={exports.matchesXlsxBusy}
          showApplyPrompt={polling.showApplyPrompt}
          onSubmitFeedback={(jobId, value) => void submitMatchFeedback(jobId, value)}
          onApply={applyToJob}
          onAutoApply={autoApplyToJob}
          onSave={saveJob}
          onDismiss={dismissJob}
          onResearch={(id, title, company, location) =>
            setIntelJob({ id, title, company, location: location ?? null })
          }
          onHiringInsights={(id, title) => setInsightsJob({ id, title })}
          onViewEmployer={(job) => setEmployerHubJob(job)}
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
          onOptimizeCv={(id, title) => setCvApp({ id, title })}
          onNegotiateSalary={(id, title) => setNegotiateApp({ id, title })}
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
        jobsLoadMoreBusy={jobsLoadMoreBusy}
        onFiltersChange={setFilters}
        onApplyFilters={() => void applyJobFilters()}
        onLoadMore={() => void loadMoreJobs()}
        setFilters={setFilters}
        onApply={applyToJob}
        onAutoApply={autoApplyToJob}
        onSave={saveJob}
        onDismiss={dismissJob}
        onResearch={(id, title, company, location) =>
          setIntelJob({ id, title, company, location: location ?? null })
        }
        onHiringInsights={(id, title) => setInsightsJob({ id, title })}
        onViewEmployer={(job) => setEmployerHubJob(job)}
      />

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
        intelJob={intelJob}
        onCloseIntel={() => setIntelJob(null)}
        insightsJob={insightsJob}
        onCloseInsights={() => setInsightsJob(null)}
        employerHubJob={employerHubJob}
        onCloseEmployerHub={() => setEmployerHubJob(null)}
        cvApp={cvApp}
        onCloseCv={() => setCvApp(null)}
        negotiateApp={negotiateApp}
        onCloseNegotiate={() => setNegotiateApp(null)}
        linkedinOpen={linkedinOpen}
        onCloseLinkedin={() => setLinkedinOpen(false)}
        linkedinDefaultRole={profile?.preferred_job_titles?.[0] ?? ""}
      />
      <HelpWidget />
    </Shell>
  );
}
