"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  apiFetch,
  apiFetchBlob,
  saveBlobAsFile,
} from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  dashboardMatchesExportQuery,
  dashboardMatchesExportXlsxQuery,
  dashboardMatchesQuery,
  MAIN_RECOMMENDATION_MIN_SCORE,
  TOP_MATCHES_HIGHLIGHT_COUNT,
  type MatchFeedbackValue,
} from "@/lib/matching-quality";
import { SHOW_SCRAPE_UI } from "@/lib/features";
import type { JobEmployerTabId } from "@/lib/job-employer-demo";
import {
  buildJobsQuery,
  defaultJobFilters,
  loadStoredJobFilters,
  persistJobFilters,
  type JobFilters,
  JOB_FEED_PAGE_MAX,
} from "@/lib/jobs";
import {
  mintAndOpenWebcalSubscribe,
  mintWebcalFeed,
  persistWebcalUrl,
  readStoredWebcalUrl,
} from "@/lib/webcal-subscribe";

import { ApplicationsSection } from "@/components/dashboard/applications-section";
import { CareerCompassStrip } from "@/components/dashboard/career-compass-strip";
import { DashboardCalendarStrip } from "@/components/dashboard/dashboard-calendar-strip";
import { DashboardModals } from "@/components/dashboard/dashboard-modals";
import { DevelopmentFocusSection } from "@/components/dashboard/development-focus-section";
import { JobsSection } from "@/components/dashboard/jobs-section";
import { MatchesSection } from "@/components/dashboard/matches-section";
import { ProfileScrapePanel } from "@/components/dashboard/profile-scrape-panel";
import {
  csvExportUserMessage,
  dashboardFetchUserMessage,
  type DashboardCalendarBundle,
  type DashboardFeedStats,
  type DashboardFilterOptions,
  type DashboardJobItem,
  type DashboardJobList,
  type DashboardMatchList,
  type DashboardProfile,
  type DashboardUser,
  type DevelopmentFocus,
  type GoogleCalendarStrip,
  type MicrosoftCalendarStrip,
} from "@/components/dashboard/dashboard-helpers";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null | undefined>(undefined);
  const [matches, setMatches] = useState<DashboardMatchList | null>(null);
  const [jobs, setJobs] = useState<DashboardJobList | null>(null);
  const [feedStats, setFeedStats] = useState<DashboardFeedStats | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [devFocus, setDevFocus] = useState<DevelopmentFocus | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackBusy>(null);
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [filters, setFilters] = useState<JobFilters>(defaultJobFilters);
  const [titleFilterPrimed, setTitleFilterPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  /** Background refresh after a queued scrape — button stays usable; feed updates on its own. */
  const [scrapePollActive, setScrapePollActive] = useState(false);
  /** Stops background job-list polling when the dashboard unmounts or user leaves. */
  const scrapePollCancelRef = useRef(false);
  const scrapePollMetaRef = useRef<{
    baselineTotal: number;
    pollFilters: JobFilters;
    hasProfile: boolean;
    startedAt: number;
  } | null>(null);
  const scrapePollStableRef = useRef({ prev: 0, ticks: 0 });
  const scrapeListToastShownRef = useRef(false);
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [placementFlowBusy, setPlacementFlowBusy] = useState<PlacementFlowBusy>(null);
  const [placementEventsInvalidateKey, setPlacementEventsInvalidateKey] = useState(0);
  const [dashboardCalendarBundle, setDashboardCalendarBundle] = useState<DashboardCalendarBundle | null>(null);
  const [nextInterviewIcsBusy, setNextInterviewIcsBusy] = useState(false);
  const [dashboardWebcalUrl, setDashboardWebcalUrl] = useState<string | null>(null);
  const [dashboardWebcalBusy, setDashboardWebcalBusy] = useState(false);
  const [calendarConnectBusy, setCalendarConnectBusy] = useState<"google" | "microsoft" | null>(null);
  const [applicationsCsvBusy, setApplicationsCsvBusy] = useState(false);
  const [applicationsXlsxBusy, setApplicationsXlsxBusy] = useState(false);
  const [matchesCsvBusy, setMatchesCsvBusy] = useState(false);
  const [matchesXlsxBusy, setMatchesXlsxBusy] = useState(false);
  const [matchesRefreshing, setMatchesRefreshing] = useState(false);
  const [matchFeedbackByJobId, setMatchFeedbackByJobId] = useState<Record<number, MatchFeedbackValue>>({});
  const [matchFeedbackBusyJobId, setMatchFeedbackBusyJobId] = useState<number | null>(null);
  const [exportJsonBusy, setExportJsonBusy] = useState(false);
  const [jobsLoadMoreBusy, setJobsLoadMoreBusy] = useState(false);
  const [dashboardBootstrapping, setDashboardBootstrapping] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());

  const loadJobs = useCallback(
    async (token: string, activeFilters: JobFilters, opts?: { skip?: number; limit?: number }) => {
      return apiFetch<DashboardJobList>(`/api/v1/jobs/${buildJobsQuery(activeFilters, opts)}`, {}, token);
    },
    [],
  );

  const loadMatches = useCallback(async (token: string) => {
    return apiFetch<DashboardMatchList>(dashboardMatchesQuery(), {}, token);
  }, []);

  const loadMatchFeedback = useCallback(async (token: string) => {
    try {
      const data = await apiFetch<{ items: { job_id: number; feedback_value: MatchFeedbackValue }[] }>(
        "/api/v1/candidates/me/match-feedback",
        {},
        token,
      );
      const map: Record<number, MatchFeedbackValue> = {};
      for (const row of data.items ?? []) {
        map[row.job_id] = row.feedback_value;
      }
      setMatchFeedbackByJobId(map);
    } catch {
      setMatchFeedbackByJobId({});
    }
  }, []);

  const loadApplications = useCallback(async (token: string) => {
    const pageSize = 200;
    let offset = 0;
    let total = 0;
    const items: ApplicationRow[] = [];
    for (;;) {
      const data = await apiFetch<{ items: ApplicationRow[]; total: number }>(
        `/api/v1/applications/me?limit=${pageSize}&offset=${offset}`,
        {},
        token,
      );
      total = data.total;
      items.push(...data.items);
      if (items.length >= total || data.items.length === 0) break;
      offset += pageSize;
    }
    return { items, total };
  }, []);

  const syncApplicationsFromApi = useCallback((payload: { items: ApplicationRow[]; total: number }) => {
    setApplications(payload.items);
    setApplicationsTotal(payload.total);
  }, []);

  const loadDevelopmentFocus = useCallback(async (token: string) => {
    try {
      return await apiFetch<DevelopmentFocus>("/api/v1/applications/me/development-focus", {}, token);
    } catch {
      return null;
    }
  }, []);

  const loadSavedJobIds = useCallback(async (token: string) => {
    try {
      const rows = await apiFetch<DashboardJobItem[]>("/api/v1/jobs/saved", {}, token);
      setSavedJobIds(new Set(rows.map((r) => r.id)));
    } catch {
      setSavedJobIds(new Set());
    }
  }, []);

  const loadGoogleCalendarStrip = useCallback(async (token: string) => {
    try {
      const [google, microsoft] = await Promise.all([
        apiFetch<GoogleCalendarStrip>("/api/v1/calendar/google/status", {}, token),
        apiFetch<MicrosoftCalendarStrip>("/api/v1/calendar/microsoft/status", {}, token).catch(() => ({
          connected: false,
          microsoft_email: null,
          oauth_configured: false,
        })),
      ]);
      let nextInterview: DashboardCalendarBundle["nextInterview"] = null;
      try {
        const rows = await apiFetch<
          {
            id: number;
            company_name: string;
            job_title: string;
            interview_start: string;
            interview_end: string;
            status: string;
            meeting_link: string | null;
            calendar_provider?: string | null;
          }[]
        >("/api/v1/calendar/me/interviews", {}, token);
        const pick = rows[0];
        if (pick && pick.status !== "cancelled") {
          nextInterview = {
            id: pick.id,
            company_name: pick.company_name,
            job_title: pick.job_title,
            interview_start: pick.interview_start,
            interview_end: pick.interview_end,
            meeting_link: pick.meeting_link,
            calendar_provider: pick.calendar_provider,
          };
        }
      } catch {
        nextInterview = null;
      }
      setDashboardCalendarBundle({ google, microsoft, nextInterview });
    } catch {
      setDashboardCalendarBundle({
        google: { connected: false, google_email: null },
        microsoft: { connected: false, microsoft_email: null },
        nextInterview: null,
      });
    }
  }, []);

  useEffect(() => {
    const stored = readStoredWebcalUrl();
    if (stored) queueMicrotask(() => setDashboardWebcalUrl(stored));
  }, []);

  const refreshDashboardData = useCallback(
    async (
      token: string,
      hasProfile: boolean,
      activeFilters: JobFilters,
      opts?: { light?: boolean },
    ): Promise<number> => {
      void loadGoogleCalendarStrip(token);
      if (hasProfile) void loadMatchFeedback(token);
      if (hasProfile && !opts?.light) setMatchesRefreshing(true);
      let jobsTotal = 0;
      try {
        if (!hasProfile) {
          setSavedJobIds(new Set());
        }
        const [jobList, matchList, apps, focus, stats] = await Promise.all([
          loadJobs(token, activeFilters),
          hasProfile ? loadMatches(token) : Promise.resolve(null),
          hasProfile ? loadApplications(token) : Promise.resolve({ items: [] as ApplicationRow[], total: 0 }),
          hasProfile ? loadDevelopmentFocus(token) : Promise.resolve(null),
          apiFetch<DashboardFeedStats>("/api/v1/jobs/feed-stats", {}, token).catch(() => null),
        ]);
        if (hasProfile) void loadSavedJobIds(token);
        setJobs(jobList);
        setFeedStats(stats);
        jobsTotal = jobList.total;
        if (matchList) setMatches(matchList);
        setApplications(apps.items);
        setApplicationsTotal(apps.total);
        setDevFocus(focus);
        setLastUpdated(new Date());
      } finally {
        if (hasProfile && !opts?.light) setMatchesRefreshing(false);
      }
      return jobsTotal;
    },
    [
      loadJobs,
      loadMatches,
      loadMatchFeedback,
      loadApplications,
      loadDevelopmentFocus,
      loadGoogleCalendarStrip,
      loadSavedJobIds,
    ],
  );

  useEffect(() => {
    return () => {
      scrapePollCancelRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!scrapePollActive) return;
    const meta = scrapePollMetaRef.current;
    if (!meta) return;

    const intervalMs = 3000;
    const maxMs = 12 * 60 * 1000;
    const stableNeeded = 3;
    const minStableMs = 8000;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finishPoll = async (finalTotal: number) => {
      if (cancelled) return;
      setScrapePollActive(false);
      scrapePollMetaRef.current = null;
      const token = getToken();
      if (!token) return;
      try {
        await refreshDashboardData(token, meta.hasProfile, meta.pollFilters);
        router.refresh();
      } catch {
        /* ignore final sync errors */
      }
      if (!scrapeListToastShownRef.current) {
        toast.success(t("dashboard.scrapePollFinalSyncToast").replace("{n}", String(finalTotal)));
      }
    };

    const tick = async () => {
      if (cancelled || scrapePollCancelRef.current) {
        setScrapePollActive(false);
        scrapePollMetaRef.current = null;
        return;
      }
      if (Date.now() - meta.startedAt > maxMs) {
        const token = getToken();
        let finalTotal = scrapePollStableRef.current.prev;
        if (token) {
          try {
            finalTotal = await refreshDashboardData(token, meta.hasProfile, meta.pollFilters, { light: true });
          } catch {
            /* use last known total */
          }
        }
        await finishPoll(finalTotal);
        return;
      }

      const token = getToken();
      if (!token) {
        setScrapePollActive(false);
        scrapePollMetaRef.current = null;
        return;
      }

      let total = scrapePollStableRef.current.prev;
      try {
        total = await refreshDashboardData(token, meta.hasProfile, meta.pollFilters, { light: true });
      } catch {
        timer = setTimeout(() => void tick(), intervalMs);
        return;
      }

      if (total > meta.baselineTotal) {
        if (!scrapeListToastShownRef.current) {
          toast.success(t("dashboard.scrapeListUpdatedToast").replace("{n}", String(total)));
          scrapeListToastShownRef.current = true;
        }
        queueMicrotask(() => {
          document.getElementById("dashboard-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      const stable = scrapePollStableRef.current;
      if (total === stable.prev) {
        stable.ticks += 1;
      } else {
        stable.prev = total;
        stable.ticks = 0;
      }

      const elapsed = Date.now() - meta.startedAt;
      const sawIncrease = total > meta.baselineTotal;
      if (sawIncrease && stable.ticks >= stableNeeded && elapsed >= minStableMs) {
        await finishPoll(total);
        return;
      }
      if (total > 0 && stable.ticks >= stableNeeded + 2 && elapsed >= minStableMs) {
        await finishPoll(total);
        return;
      }

      timer = setTimeout(() => void tick(), intervalMs);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [scrapePollActive, refreshDashboardData, router, t]);

  const applicationByJobId = useMemo(() => {
    const map: Record<number, string> = {};
    for (const app of applications) {
      map[app.job_id] =
        app.display_status ?? app.submission_status ?? app.status;
    }
    return map;
  }, [applications]);

  const displayApplicationStatus = useMemo(() => {
    const m: Record<number, string> = { ...applicationByJobId };
    savedJobIds.forEach((id) => {
      if (!(id in m)) m[id] = "saved";
    });
    return m;
  }, [applicationByJobId, savedJobIds]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      queueMicrotask(() => setDashboardBootstrapping(false));
      return;
    }

    let cancelled = false;

    (async () => {
      let u: DashboardUser;
      try {
        u = await apiFetch<DashboardUser>("/api/v1/auth/me", {}, token);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        const lower = msg.toLowerCase();
        const looksLikeAuthFailure =
          lower.includes("401") ||
          lower.includes("403") ||
          lower.includes("invalid token") ||
          lower.includes("inactive user") ||
          lower.includes("not authenticated") ||
          lower.includes("could not validate credentials");
        if (looksLikeAuthFailure) {
          clearToken();
          router.replace("/login");
        } else {
          setError(msg);
        }
        return;
      }

      if (cancelled) return;
      setUser(u);

      let hasProfile = false;
      try {
        const p = await apiFetch<DashboardProfile>("/api/v1/candidates/me", {}, token);
        if (cancelled) return;
        setProfile(p);
        hasProfile = true;
      } catch {
        if (cancelled) return;
        setProfile(null);
      }

      try {
        const opts = await apiFetch<DashboardFilterOptions>("/api/v1/jobs/filters", {}, token);
        if (cancelled) return;
        setFilterOptions(opts);
      } catch (e) {
        if (cancelled) return;
        setFilterOptions({ job_boards: [], locations: [] });
        setError(dashboardFetchUserMessage(e, t));
      }

      try {
        await refreshDashboardData(token, hasProfile, defaultJobFilters);
      } catch (e) {
        if (cancelled) return;
        setError(dashboardFetchUserMessage(e, t));
      }
    })().finally(() => {
      if (!cancelled) setDashboardBootstrapping(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router, refreshDashboardData, t]);

  useEffect(() => {
    if (titleFilterPrimed) return;
    if (!profile?.preferred_job_titles?.length) return;
    const token = getToken();
    if (!token) return;
    queueMicrotask(() => {
      setFilters((prev) => {
        const next = { ...prev, title_terms: profile.preferred_job_titles.join(", ") };
        queueMicrotask(() => {
          void refreshDashboardData(token, true, next);
        });
        return next;
      });
      setTitleFilterPrimed(true);
    });
  }, [profile, titleFilterPrimed, refreshDashboardData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("placement_verify")?.trim();
    if (!token) return;

    const doneKey = `twin_placement_verify_done:${token}`;
    if (sessionStorage.getItem(doneKey)) {
      params.delete("placement_verify");
      const qs = params.toString();
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
      const authToken = getToken();
      if (authToken) {
        void loadApplications(authToken).then(syncApplicationsFromApi).catch(() => {});
        void loadDevelopmentFocus(authToken).then(setDevFocus).catch(() => {});
      }
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        await apiFetch<{ ok: boolean; message: string }>(
          "/api/v1/placement/verify/confirm",
          { method: "POST", body: JSON.stringify({ token }), signal: ac.signal },
          undefined,
        );
        if (ac.signal.aborted) return;
        sessionStorage.setItem(doneKey, "1");
        alert(t("dashboard.placementVerifyOkAlert"));
        const authToken = getToken();
        if (authToken) {
          try {
            syncApplicationsFromApi(await loadApplications(authToken));
            setDevFocus(await loadDevelopmentFocus(authToken));
            setPlacementEventsInvalidateKey((k) => k + 1);
          } catch {
            /* ignore refresh errors after confirm */
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (e instanceof Error && e.name === "AbortError") return;
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : String(e);
        alert(`${t("dashboard.placementVerifyFailed")}: ${msg}`);
      } finally {
        if (ac.signal.aborted) return;
        params.delete("placement_verify");
        const qs = params.toString();
        router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
      }
    })();

    return () => ac.abort();
  }, [router, t, loadApplications, loadDevelopmentFocus, syncApplicationsFromApi]);

  useEffect(() => {
    const restored = loadStoredJobFilters();
    if (restored) queueMicrotask(() => setFilters(restored));
  }, []);

  async function applyFilters() {
    const token = getToken();
    if (!token) return;
    persistJobFilters(filters);
    await refreshDashboardData(token, profile !== null && profile !== undefined, filters);
  }

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

  async function downloadApplicationsCsv() {
    const token = getToken();
    if (!token) return;
    setApplicationsCsvBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob("/api/v1/applications/me/export.csv", {}, token);
      saveBlobAsFile(blob, "twin-applications.csv");
      toast.success(t("dashboard.applicationsCsvDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setApplicationsCsvBusy(false);
    }
  }

  async function downloadApplicationsXlsx() {
    const token = getToken();
    if (!token) return;
    setApplicationsXlsxBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob("/api/v1/applications/me/export.xlsx", {}, token);
      saveBlobAsFile(blob, "twin-applications.xlsx");
      toast.success(t("dashboard.applicationsXlsxDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setApplicationsXlsxBusy(false);
    }
  }

  async function downloadMatchesCsv() {
    const token = getToken();
    if (!token) return;
    setMatchesCsvBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob(dashboardMatchesExportQuery(), {}, token);
      saveBlobAsFile(blob, "twin-matches.csv");
      toast.success(t("dashboard.matchesCsvDownloadedToast"));
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setMatchesCsvBusy(false);
    }
  }

  async function downloadMatchesXlsx() {
    const token = getToken();
    if (!token) return;
    setMatchesXlsxBusy(true);
    setError(null);
    try {
      const blob = await apiFetchBlob(dashboardMatchesExportXlsxQuery(), {}, token);
      saveBlobAsFile(blob, "twin-matches.xlsx");
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setMatchesXlsxBusy(false);
    }
  }

  async function downloadMyDataJson() {
    const token = getToken();
    if (!token) return;
    setExportJsonBusy(true);
    setError(null);
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/v1/candidates/me/export.json", {}, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      saveBlobAsFile(blob, "twin-my-data.json");
    } catch (err) {
      setError(csvExportUserMessage(err, t));
    } finally {
      setExportJsonBusy(false);
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
      setPlacementEventsInvalidateKey((k) => k + 1);
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
      setPlacementEventsInvalidateKey((k) => k + 1);
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
      setPlacementEventsInvalidateKey((k) => k + 1);
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
      setPlacementEventsInvalidateKey((k) => k + 1);
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t));
    } finally {
      setPlacementFlowBusy(null);
    }
  }

  const loadPlacementEvents = useCallback(
    async (applicationId: number) => {
      const token = getToken();
      if (!token) throw new Error(t("dashboard.placementEventsNotSignedIn"));
      const data = await apiFetch<{ items: PlacementEventRow[]; total: number }>(
        `/api/v1/applications/${applicationId}/placement-events`,
        {},
        token,
      );
      return data.items;
    },
    [t],
  );

  async function triggerScrapeAll() {
    const token = getToken();
    if (!token) return;
    const hasProf = profile !== null && profile !== undefined;
    const pollFilters: JobFilters = { ...filters, title_terms: "" };
    if (pollFilters.title_terms !== filters.title_terms) {
      setFilters(pollFilters);
      persistJobFilters(pollFilters);
    }
    const baselineTotal = jobs?.total ?? 0;
    setError(null);
    scrapePollCancelRef.current = false;
    scrapeListToastShownRef.current = false;
    scrapePollStableRef.current = { prev: baselineTotal, ticks: 0 };
    setScraping(true);
    try {
      const result = await apiFetch<{ message: string; task_id?: string }>(
        "/api/v1/jobs/scrape/all",
        { method: "POST" },
        token,
      );
      const queued = Boolean(result.task_id && result.task_id !== "sync");
      toast.success(queued ? t("dashboard.scrapeQueued") : result.message || t("dashboard.scrapeFinished"));
      if (hasProf) {
        setShowApplyPrompt(true);
      }
      try {
        const lastTotal = await refreshDashboardData(token, hasProf, pollFilters, { light: true });
        scrapePollStableRef.current = { prev: lastTotal, ticks: 0 };
        if (lastTotal > baselineTotal) {
          toast.success(t("dashboard.scrapeListUpdatedToast").replace("{n}", String(lastTotal)));
          scrapeListToastShownRef.current = true;
          queueMicrotask(() => {
            document.getElementById("dashboard-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        } else if (!queued) {
          queueMicrotask(() => {
            document.getElementById("dashboard-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
        if (queued) {
          scrapePollMetaRef.current = {
            baselineTotal: Math.max(baselineTotal, lastTotal),
            pollFilters,
            hasProfile: hasProf,
            startedAt: Date.now(),
          };
          setScrapePollActive(true);
        } else {
          await refreshDashboardData(token, hasProf, pollFilters);
          router.refresh();
        }
      } catch (refreshErr) {
        setError(
          `${t("dashboard.scrapeRefreshFailed")} ${dashboardFetchUserMessage(refreshErr, t, "scrape")}`,
        );
      }
    } catch (err) {
      setError(dashboardFetchUserMessage(err, t, "scrape"));
    } finally {
      setScraping(false);
    }
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
          exportJsonBusy={exportJsonBusy}
          onExportJson={() => void downloadMyDataJson()}
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
        scraping={scraping}
        scrapePollActive={scrapePollActive}
        jobsTotal={jobs?.total ?? 0}
        error={error}
        onTriggerScrape={() => void triggerScrapeAll()}
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
          matchesCsvBusy={matchesCsvBusy}
          matchesXlsxBusy={matchesXlsxBusy}
          showApplyPrompt={showApplyPrompt}
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
          onDownloadCsv={() => void downloadMatchesCsv()}
          onDownloadXlsx={() => void downloadMatchesXlsx()}
          onApplyPromptDismiss={() => setShowApplyPrompt(false)}
          onApplyPromptOpenFirst={() => {
            setShowApplyPrompt(false);
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
          applicationsCsvBusy={applicationsCsvBusy}
          applicationsXlsxBusy={applicationsXlsxBusy}
          feedbackBusy={feedbackBusy}
          placementFlowBusy={placementFlowBusy}
          placementEventsInvalidateKey={placementEventsInvalidateKey}
          onDownloadCsv={() => void downloadApplicationsCsv()}
          onDownloadXlsx={() => void downloadApplicationsXlsx()}
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
        onApplyFilters={() => void applyFilters()}
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
