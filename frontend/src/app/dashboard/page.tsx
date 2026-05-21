"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ApplicationsPanel,
  type ApplicationRow,
  type FeedbackBusy,
  type PlacementEventRow,
  type PlacementFlowBusy,
} from "@/components/applications-panel";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { DashboardTutorial } from "@/components/dashboard/dashboard-tutorial";
import { FeedbackModal } from "@/components/feedback/feedback-modal";
import { HelpWidget } from "@/components/help/help-widget";
import { InvestorRoadmapPanel } from "@/components/investor-roadmap-panel";
import { useTranslation } from "@/components/language-provider";
import { JobFiltersBar } from "@/components/job-filters";
import { JobList } from "@/components/job-list";
import { Button, ButtonCta, Card, Shell } from "@/components/ui";
import { apiFetch, apiFetchBlob, isLikelyBrowserNetworkFailureMessage, saveBlobAsFile } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { SHOW_SCRAPE_UI } from "@/lib/features";
import type { TranslationKey } from "@/lib/i18n";
import {
  buildJobsQuery,
  defaultJobFilters,
  jobFiltersAreDefault,
  loadStoredJobFilters,
  persistJobFilters,
  type JobFilters,
  JOB_FEED_PAGE_MAX,
} from "@/lib/jobs";

type User = {
  id: number;
  email: string;
  plan_tier?: string;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  scrape_ops_configured?: boolean;
  can_trigger_scrape?: boolean;
  scrape_worker_ready?: boolean;
  mail_configured?: boolean;
  microsoft_calendar_oauth_configured?: boolean;
};
type Profile = {
  name: string;
  skills: string[];
  preferred_job_titles: string[];
  experience_years: number;
  desired_salary: number | null;
  location: string | null;
  career_compass_preview?: {
    configured: boolean;
    readiness_score: number | null;
    level: number | null;
    xp_total: number | null;
    next_milestone_title: string | null;
  } | null;
};
type JobItem = {
  id: number;
  title: string;
  company: string;
  job_board: string;
  location: string | null;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  score?: number | null;
};
type JobList = { items: JobItem[]; total: number };
type MatchItem = {
  job_id: number;
  score: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
};
type MatchList = { items: MatchItem[]; total: number };
type FilterOptions = { job_boards: string[]; locations: string[] };

type GoogleCalendarStrip = {
  connected: boolean;
  google_email: string | null;
  oauth_configured?: boolean;
  oauth_redirect_uri?: string | null;
};

type MicrosoftCalendarStrip = {
  connected: boolean;
  microsoft_email: string | null;
  oauth_configured?: boolean;
};

const DASHBOARD_WEBCAL_STORAGE_KEY = "twin_dashboard_webcal_url";

type DashboardCalendarBundle = {
  google: GoogleCalendarStrip;
  microsoft: MicrosoftCalendarStrip;
  nextInterview: {
    id: number;
    company_name: string;
    job_title: string;
    interview_start: string;
    interview_end: string;
    meeting_link: string | null;
  } | null;
};

type DevelopmentFocus = {
  skill_tool_gaps: string[];
  positioning_themes: string[];
  stronger_candidate_signals: string[];
  upskill_actions_prioritized: { title: string; priority: string; rationale: string }[];
  roles_with_insights: { application_id: number; job_id: number; title: string; company: string; summary: string | null }[];
};

/** Map API/proxy failures to actionable copy (Vercel ↔ Railway). */
function dashboardFetchUserMessage(
  err: unknown,
  t: (key: TranslationKey) => string,
  networkHint: "scrape" | "general" = "general",
): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lc = raw.trim().toLowerCase();
  if (lc.includes("missing api base url") || lc.includes("cannot reach api")) {
    return t("dashboard.scrapeUpstreamHint");
  }
  if (isLikelyBrowserNetworkFailureMessage(raw)) {
    return networkHint === "scrape" ? t("dashboard.scrapeNetworkError") : t("dashboard.apiNetworkError");
  }
  if (networkHint === "scrape" && lc.includes("ops role")) {
    if (lc.includes("scrape_ops_emails") || lc.includes("scrape_ops_user_ids") || lc.includes("configure")) {
      return t("dashboard.scrapeOpsNotConfigured");
    }
    return t("dashboard.scrapeOpsDenied");
  }
  return raw.trim() || t("dashboard.scrapeFailed");
}

function csvExportUserMessage(err: unknown, t: (key: TranslationKey) => string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lc = raw.trim().toLowerCase();
  if (
    lc.includes("401") ||
    lc.includes("403") ||
    lc.includes("invalid token") ||
    lc.includes("inactive user") ||
    lc.includes("not authenticated") ||
    lc.includes("could not validate credentials")
  ) {
    return t("dashboard.csvExportSession");
  }
  if (lc.includes("404")) {
    return t("dashboard.csvExportNotFound");
  }
  if (isLikelyBrowserNetworkFailureMessage(raw)) {
    return t("dashboard.apiNetworkError");
  }
  return `${t("dashboard.csvExportCouldNotDownload")} ${t("dashboard.csvExportDetailPrefix")} ${raw.trim() || "—"}`;
}

function formatInterviewRangeShort(isoStart: string, isoEnd: string, locale: string): string {
  const a = new Date(isoStart);
  const b = new Date(isoEnd);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${a.toLocaleString(locale, opts)} → ${b.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [matches, setMatches] = useState<MatchList | null>(null);
  const [jobs, setJobs] = useState<JobList | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [devFocus, setDevFocus] = useState<DevelopmentFocus | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackBusy>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
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
  const [exportJsonBusy, setExportJsonBusy] = useState(false);
  const [jobsLoadMoreBusy, setJobsLoadMoreBusy] = useState(false);
  const [dashboardBootstrapping, setDashboardBootstrapping] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());

  const loadJobs = useCallback(async (token: string, activeFilters: JobFilters, opts?: { skip?: number; limit?: number }) => {
    return apiFetch<JobList>(`/api/v1/jobs/${buildJobsQuery(activeFilters, opts)}`, {}, token);
  }, []);

  const loadMatches = useCallback(async (token: string) => {
    return apiFetch<MatchList>("/api/v1/candidates/me/matches?limit=220&min_score=15", {}, token);
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
      const rows = await apiFetch<JobItem[]>("/api/v1/jobs/saved", {}, token);
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
          }[]
        >("/api/v1/calendar/google/interviews", {}, token);
        const pick = rows[0];
        if (pick && pick.status !== "cancelled") {
          nextInterview = {
            id: pick.id,
            company_name: pick.company_name,
            job_title: pick.job_title,
            interview_start: pick.interview_start,
            interview_end: pick.interview_end,
            meeting_link: pick.meeting_link,
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
    try {
      const stored = sessionStorage.getItem(DASHBOARD_WEBCAL_STORAGE_KEY);
      if (stored?.trim()) setDashboardWebcalUrl(stored.trim());
    } catch {
      /* ignore */
    }
  }, []);

  const refreshDashboardData = useCallback(
    async (
      token: string,
      hasProfile: boolean,
      activeFilters: JobFilters,
      opts?: { light?: boolean },
    ): Promise<number> => {
      void loadGoogleCalendarStrip(token);
      if (hasProfile && !opts?.light) setMatchesRefreshing(true);
      let jobsTotal = 0;
      try {
        if (!hasProfile) {
          setSavedJobIds(new Set());
        }
        const [jobList, matchList, apps, focus] = await Promise.all([
          loadJobs(token, activeFilters),
          hasProfile ? loadMatches(token) : Promise.resolve(null),
          hasProfile ? loadApplications(token) : Promise.resolve({ items: [] as ApplicationRow[], total: 0 }),
          hasProfile ? loadDevelopmentFocus(token) : Promise.resolve(null),
          hasProfile ? loadSavedJobIds(token) : Promise.resolve(null),
        ]);
        setJobs(jobList);
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
    [loadJobs, loadMatches, loadApplications, loadDevelopmentFocus, loadGoogleCalendarStrip, loadSavedJobIds],
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
      map[app.job_id] = app.status;
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
      setDashboardBootstrapping(false);
      return;
    }

    let cancelled = false;

    (async () => {
      let u: User;
      try {
        u = await apiFetch<User>("/api/v1/auth/me", {}, token);
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
        const p = await apiFetch<Profile>("/api/v1/candidates/me", {}, token);
        if (cancelled) return;
        setProfile(p);
        hasProfile = true;
      } catch {
        if (cancelled) return;
        setProfile(null);
      }

      try {
        const opts = await apiFetch<FilterOptions>("/api/v1/jobs/filters", {}, token);
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
    if (restored) setFilters(restored);
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

  function applyToJob(jobId: number, url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    void setJobApplication(jobId, "applied");
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
    return items.filter((job) => applicationByJobId[job.job_id] !== "rejected");
  }, [matches?.items, applicationByJobId]);

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
      const blob = await apiFetchBlob(
        "/api/v1/candidates/me/matches/export.csv?limit=220&min_score=15",
        {},
        token,
      );
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
      const blob = await apiFetchBlob(
        "/api/v1/candidates/me/matches/export.xlsx?limit=220&min_score=15",
        {},
        token,
      );
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

  async function mintDashboardWebcalLink() {
    const token = getToken();
    if (!token) return;
    setDashboardWebcalBusy(true);
    try {
      const out = await apiFetch<{ webcal_url: string }>(
        "/api/v1/calendar/me/webcal-token",
        { method: "POST", body: "{}" },
        token,
      );
      setDashboardWebcalUrl(out.webcal_url);
      try {
        sessionStorage.setItem(DASHBOARD_WEBCAL_STORAGE_KEY, out.webcal_url);
      } catch {
        /* ignore */
      }
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
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
          {t("dashboard.title")}
        </h1>
        <nav
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2"
          aria-label={t("dashboard.title")}
        >
          <Link
            href="/profile"
            className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start sm:text-left"
          >
            {t("nav.profile")}
          </Link>
          <Link
            href="/dashboard/career"
            className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start sm:text-left"
          >
            {t("dashboard.careerCompassLink")}
          </Link>
          <Link
            href="/dashboard/billing"
            className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start sm:text-left"
          >
            {t("dashboard.billingLink")}
          </Link>
          <Link
            href="/dashboard/identity"
            className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start sm:text-left"
          >
            {t("dashboard.identityLink")}
          </Link>
          <Link
            href="/dashboard/calendar"
            className="twin-link inline-flex min-h-[2.75rem] items-center justify-center px-1 text-sm sm:justify-start sm:text-left"
          >
            {t("dashboard.calendarLink")}
          </Link>
          <button
            type="button"
            className="twin-link inline-flex min-h-[2.75rem] cursor-pointer items-center justify-center border-0 bg-transparent p-0 px-1 text-sm font-[inherit] sm:justify-start sm:text-left disabled:opacity-50"
            disabled={exportJsonBusy}
            aria-label={t("dashboard.exportMyDataJsonAria")}
            onClick={() => void downloadMyDataJson()}
          >
            {exportJsonBusy ? "…" : t("dashboard.exportMyDataJson")}
          </button>
        </nav>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("dashboard.northStarEyebrow")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.northStarLead")}</p>
      </div>

      {user ? (
        <>
          <DashboardCommandCenter
            email={user.email}
            profileName={profile ? profile.name : undefined}
            hasProfile={hasProfile}
            showScrapeUi={SHOW_SCRAPE_UI}
            jobsTotal={jobs?.total ?? 0}
            matchesVisible={visibleMatches.length}
            applicationsActive={pipelineActiveCount}
          />
          <Card variant="soft" className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.calendarStripTitle")}</p>
                <p className="twin-muted mt-1 text-xs leading-relaxed">
                  {dashboardCalendarBundle === null
                    ? t("dashboard.calendarStripLoading")
                    : dashboardCalendarBundle.google.connected
                      ? t("dashboard.calendarStripConnected").replace(
                          "{email}",
                          dashboardCalendarBundle.google.google_email?.trim() || "—",
                        )
                      : dashboardCalendarBundle.google.oauth_configured === false
                        ? t("dashboard.calendarGoogleOAuthNotConfigured")
                        : t("dashboard.calendarStripDisconnected")}
                </p>
                {dashboardCalendarBundle &&
                !dashboardCalendarBundle.google.connected &&
                dashboardCalendarBundle.google.oauth_configured ? (
                  <Button
                    type="button"
                    className="twin-touch-target mt-3 !w-auto"
                    disabled={calendarConnectBusy !== null}
                    onClick={() => void connectGoogleCalendarFromDashboard()}
                  >
                    {calendarConnectBusy === "google" ? "…" : t("dashboard.calendarStripConnectGoogle")}
                  </Button>
                ) : null}
                {dashboardCalendarBundle ? (
                  <div className="mt-3 border-t border-[var(--twin-border)] pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                      Microsoft 365 / Outlook
                    </p>
                    <p className="twin-muted mt-1 text-xs leading-relaxed">
                      {dashboardCalendarBundle.microsoft.connected
                        ? t("dashboard.calendarStripMicrosoftConnected").replace(
                            "{email}",
                            dashboardCalendarBundle.microsoft.microsoft_email?.trim() || "—",
                          )
                        : dashboardCalendarBundle.microsoft.oauth_configured === false
                          ? t("dashboard.calendarMicrosoftOAuthNotConfigured")
                          : t("dashboard.calendarStripMicrosoftDisconnected")}
                    </p>
                    {!dashboardCalendarBundle.microsoft.connected &&
                    dashboardCalendarBundle.microsoft.oauth_configured ? (
                      <Button
                        type="button"
                        className="twin-touch-target mt-2 !w-auto"
                        disabled={calendarConnectBusy !== null}
                        onClick={() => void connectMicrosoftCalendarFromDashboard()}
                      >
                        {calendarConnectBusy === "microsoft" ? "…" : t("dashboard.calendarStripConnectMicrosoft")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {dashboardCalendarBundle &&
                (dashboardCalendarBundle.nextInterview ||
                  dashboardCalendarBundle.google.connected ||
                  dashboardCalendarBundle.microsoft.connected) ? (
                  <div className="mt-3 border-t border-[var(--twin-border)] pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                      {t("dashboard.calendarNextInterviewTitle")}
                    </p>
                    {dashboardCalendarBundle.nextInterview ? (
                      <>
                        <p className="mt-1.5 text-sm font-medium text-[var(--foreground)]">
                          {dashboardCalendarBundle.nextInterview.job_title}
                          <span className="font-normal text-[var(--twin-muted-strong)]">
                            {" "}
                            · {dashboardCalendarBundle.nextInterview.company_name}
                          </span>
                        </p>
                        <p className="twin-muted mt-0.5 text-xs">
                          {formatInterviewRangeShort(
                            dashboardCalendarBundle.nextInterview.interview_start,
                            dashboardCalendarBundle.nextInterview.interview_end,
                            locale,
                          )}
                        </p>
                        {dashboardCalendarBundle.nextInterview.meeting_link?.trim() ? (
                          <a
                            href={dashboardCalendarBundle.nextInterview.meeting_link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="twin-link mt-1 inline-block text-xs font-medium"
                          >
                            {t("dashboard.calendarNextInterviewJoinLink")}
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={nextInterviewIcsBusy}
                          className="twin-link mt-2 text-xs font-medium"
                          onClick={() => {
                            void (async () => {
                              const token = getToken();
                              const ni = dashboardCalendarBundle.nextInterview;
                              if (!token || !ni) return;
                              setNextInterviewIcsBusy(true);
                              try {
                                const blob = await apiFetchBlob(
                                  `/api/v1/calendar/interviews/${ni.id}/ics`,
                                  {},
                                  token,
                                );
                                saveBlobAsFile(blob, `twin-interview-${ni.id}.ics`);
                              } catch {
                                /* optional: surface via setError */
                              } finally {
                                setNextInterviewIcsBusy(false);
                              }
                            })();
                          }}
                        >
                          {nextInterviewIcsBusy ? "…" : t("dashboard.calendarInterviewDownloadIcs")}
                        </button>
                      </>
                    ) : (
                      <p className="twin-muted mt-1.5 text-xs leading-relaxed">
                        {t("dashboard.calendarNextInterviewEmpty")}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 self-start sm:min-w-[12rem]">
                <button
                  type="button"
                  className="twin-btn-solid twin-touch-target text-sm"
                  disabled={dashboardWebcalBusy}
                  onClick={() => void mintDashboardWebcalLink()}
                >
                  {dashboardWebcalBusy ? "…" : t("dashboard.calendarStripWebcalGenerate")}
                </button>
                {dashboardWebcalUrl ? (
                  <div className="flex flex-col gap-1">
                    <input
                      readOnly
                      value={dashboardWebcalUrl}
                      className="twin-input text-xs"
                      aria-label="WebCal subscribe URL"
                    />
                    <button
                      type="button"
                      className="twin-btn-secondary text-xs"
                      onClick={() => void navigator.clipboard.writeText(dashboardWebcalUrl)}
                    >
                      {t("dashboard.calendarStripWebcalCopy")}
                    </button>
                  </div>
                ) : (
                  <p className="twin-muted text-[11px] leading-snug">{t("dashboard.calendarStripWebcalHint")}</p>
                )}
                <Link
                  href="/dashboard/calendar"
                  className="twin-btn-secondary twin-touch-target text-center text-sm sm:text-left"
                >
                  {t("dashboard.calendarStripCta")}
                </Link>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {hasProfile && profile?.career_compass_preview?.configured ? (
        <Card variant="soft" className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.careerCompassLink")}</p>
              <p className="twin-muted mt-1 text-xs">
                {t("dashboard.careerCompassStats")
                  .replace("{readiness}", String(profile.career_compass_preview.readiness_score ?? "—"))
                  .replace("{level}", String(profile.career_compass_preview.level ?? "—"))
                  .replace("{xp}", String(profile.career_compass_preview.xp_total ?? "—"))}
                {profile.career_compass_preview.next_milestone_title
                  ? ` · ${t("dashboard.careerCompassNextMilestone").replace("{title}", profile.career_compass_preview.next_milestone_title)}`
                  : ""}
              </p>
            </div>
            <Link href="/dashboard/career" className="twin-btn-solid twin-touch-target shrink-0 text-center text-sm">
              {t("dashboard.careerCompassPageTitle")}
            </Link>
          </div>
        </Card>
      ) : hasProfile ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassPreviewHint")}</p>
          <Link href="/dashboard/career" className="twin-link mt-2 inline-block text-sm font-medium">
            {t("dashboard.careerCompassLink")} →
          </Link>
        </Card>
      ) : null}

      <Card variant="accent">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 twin-card-inset p-4 sm:p-5">
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
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{profile.name}</p>
                  <Link href="/profile" className="twin-link shrink-0 text-sm">
                    {t("dashboard.edit")}
                  </Link>
                </div>
                <p className="twin-muted mt-1 text-sm">{profile.skills.join(", ")}</p>
                <p className="twin-muted mt-1 text-sm">
                  {profile.experience_years} {t("dashboard.years")}
                  {profile.location ? ` · ${profile.location}` : ""}
                  {profile.desired_salary
                    ? ` · ${profile.desired_salary.toLocaleString()} PLN/mo`
                    : ""}
                </p>
              </div>
            )}
          </div>

          {SHOW_SCRAPE_UI && (
            <div id="dashboard-scrape" className="twin-card-inset w-full shrink-0 p-4 sm:p-5 lg:max-w-lg xl:max-w-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
                {t("dashboard.twinScrapePanelTitle")}
              </p>
              <ButtonCta
                type="button"
                aria-label={t("dashboard.twinForYourJob")}
                onClick={() => triggerScrapeAll()}
                disabled={
                  scraping ||
                  user?.can_trigger_scrape === false ||
                  user?.scrape_worker_ready === false
                }
                className="!mt-4 !rounded-full !py-3.5 !text-base !font-bold !tracking-tight !shadow-lg"
              >
                {scraping ? t("dashboard.twinForYourJobRunning") : t("dashboard.twinForYourJob")}
              </ButtonCta>
              {scrapePollActive ? (
                <p className="mt-3 text-sm font-medium text-[var(--twin-link)]" aria-live="polite">
                  {t("dashboard.scrapeRefreshingBanner").replace("{n}", String(jobs?.total ?? 0))}
                </p>
              ) : null}
              {user?.can_trigger_scrape === false ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  {user.scrape_ops_configured
                    ? t("dashboard.scrapeOpsDenied")
                    : t("dashboard.scrapeOpsNotConfigured")}
                  {user.scrape_ops_configured ? (
                    <>
                      {" "}
                      (id {user.id}, {user.email})
                    </>
                  ) : null}
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
              <p className="twin-muted mt-3 text-xs leading-relaxed">{t("dashboard.twinForYourJobHint")}</p>
              <p className="twin-muted mt-2 text-[11px] leading-relaxed">
                {t("dashboard.scrapeAllHint")} {t("dashboard.keepApiOpen")}
              </p>
              <InvestorRoadmapPanel />
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </Card>

      {hasProfile && (matchesInitialSkeleton || (matches && matches.items.length > 0)) && (
        <Card id="dashboard-matches" variant="soft">
          {matchesInitialSkeleton ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <p className="twin-muted text-sm">{t("dashboard.matchesLoading")}</p>
              <div className="h-8 w-56 max-w-full animate-pulse rounded bg-[var(--twin-border)]" />
              <div className="h-28 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
              <div className="h-28 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
            </div>
          ) : (
            <>
              {showApplyPrompt && visibleMatches.length > 0 ? (
            <div className="mb-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-accent-muted)]/80 p-4 shadow-sm">
              <p className="text-sm font-semibold text-[var(--twin-accent-hover)]">{t("dashboard.applyPromptTitle")}</p>
              <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.applyPromptLead")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="twin-btn-solid twin-touch-target !min-h-[2.5rem] px-4 text-sm"
                  onClick={() => {
                    setShowApplyPrompt(false);
                    const first = visibleMatches[0];
                    if (first) window.open(first.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  {t("dashboard.applyPromptYes")}
                </button>
                <button
                  type="button"
                  className="twin-btn-secondary twin-touch-target !min-h-[2.5rem] px-4 text-sm"
                  onClick={() => setShowApplyPrompt(false)}
                >
                  {t("dashboard.applyPromptNo")}
                </button>
                <button
                  type="button"
                  className="twin-touch-target rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-4 py-2 text-sm font-medium text-[var(--twin-muted-strong)]"
                  onClick={() => setShowApplyPrompt(false)}
                >
                  {t("dashboard.applyPromptLater")}
                </button>
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="twin-section-title">
              {t("dashboard.topMatches")} ({matches?.total ?? 0})
            </h2>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto sm:shrink-0">
              <button
                type="button"
                aria-label={t("dashboard.matchesExportCsv")}
                disabled={matchesCsvBusy || matchesXlsxBusy}
                onClick={() => void downloadMatchesCsv()}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {matchesCsvBusy ? "…" : t("dashboard.matchesExportCsv")}
              </button>
              <button
                type="button"
                aria-label={t("dashboard.matchesExportXlsxAria")}
                disabled={matchesCsvBusy || matchesXlsxBusy}
                onClick={() => void downloadMatchesXlsx()}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {matchesXlsxBusy ? "…" : t("dashboard.matchesExportXlsx")}
              </button>
            </div>
          </div>
          <JobList
            items={visibleMatches}
            showScore
            applicationStatus={displayApplicationStatus}
            onApply={applyToJob}
            onAutoApply={autoApplyToJob}
            autoApplyJobId={autoApplyingId}
            onSave={saveJob}
            onDismiss={dismissJob}
          />
            </>
          )}
        </Card>
      )}

      {hasProfile && (
        <Card id="dashboard-development-focus" variant="soft">
          <h2 className="twin-section-title mb-2">{t("dashboard.developmentFocusTitle")}</h2>
          <p className="twin-muted mb-4 text-sm leading-relaxed">{t("dashboard.developmentFocusLead")}</p>
          {!developmentFocusHasData ? (
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.developmentFocusEmpty")}</p>
          ) : (
            <div className="space-y-4 text-sm">
              {devFocus!.skill_tool_gaps.length > 0 ? (
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusSkills")}</p>
                  <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                    {devFocus!.skill_tool_gaps.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {devFocus!.positioning_themes.length > 0 ? (
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {t("dashboard.developmentFocusPositioning")}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                    {devFocus!.positioning_themes.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {devFocus!.stronger_candidate_signals.length > 0 ? (
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusOthers")}</p>
                  <ul className="mt-1 list-inside list-disc text-[var(--twin-muted-strong)]">
                    {devFocus!.stronger_candidate_signals.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {devFocus!.upskill_actions_prioritized.length > 0 ? (
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusActions")}</p>
                  <ul className="mt-1 space-y-2 text-[var(--twin-muted-strong)]">
                    {devFocus!.upskill_actions_prioritized.map((a) => (
                      <li key={`${a.title}-${a.priority}`}>
                        <span className="font-medium text-[var(--foreground)]">[{a.priority}]</span> {a.title}
                        {a.rationale ? (
                          <span className="mt-0.5 block text-xs text-[var(--twin-muted)]">{a.rationale}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {devFocus!.roles_with_insights.length > 0 ? (
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{t("dashboard.developmentFocusRoles")}</p>
                  <ul className="mt-1 space-y-2 text-xs text-[var(--twin-muted-strong)]">
                    {devFocus!.roles_with_insights.map((r) => (
                      <li key={r.application_id}>
                        <span className="font-medium text-[var(--foreground)]">{r.title}</span> — {r.company}
                        {r.summary ? (
                          <span className="mt-0.5 block text-[var(--twin-muted)]">{r.summary}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      )}

      {hasProfile && (
        <Card id="dashboard-applications" variant="soft">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="twin-section-title">
              {t("dashboard.applications")}{" "}
              <span className="twin-muted text-base font-normal">
                {applications.length >= applicationsTotal
                  ? t("dashboard.applicationsSummaryAll").replace("{total}", String(applicationsTotal))
                  : t("dashboard.applicationsSummaryPartial")
                      .replace("{shown}", String(applications.length))
                      .replace("{total}", String(applicationsTotal))}
              </span>
            </h2>
            <div className="flex flex-wrap gap-2 self-start sm:justify-end">
              <button
                type="button"
                aria-label={t("dashboard.applicationsExportCsv")}
                disabled={applicationsCsvBusy || applicationsXlsxBusy}
                onClick={() => void downloadApplicationsCsv()}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {applicationsCsvBusy ? "…" : t("dashboard.applicationsExportCsv")}
              </button>
              <button
                type="button"
                aria-label={t("dashboard.applicationsExportXlsx")}
                disabled={applicationsCsvBusy || applicationsXlsxBusy}
                onClick={() => void downloadApplicationsXlsx()}
                className="twin-btn-secondary twin-touch-target text-sm"
              >
                {applicationsXlsxBusy ? "…" : t("dashboard.applicationsExportXlsx")}
              </button>
            </div>
          </div>
          <ApplicationsPanel
            items={applications}
            onStatusChange={updateApplicationStatus}
            onRemove={removeApplication}
            onSaveFeedback={saveApplicationFeedback}
            onParseFeedback={parseApplicationFeedback}
            feedbackBusy={feedbackBusy}
            onPlacementDeclare={declarePlacement}
            onPlacementVerifyStart={startPlacementVerify}
            placementFlowBusy={placementFlowBusy}
            onPlacementEventsLoad={loadPlacementEvents}
            placementEventsInvalidateKey={placementEventsInvalidateKey}
            onOpenAutoApplyPackage={openAutoApplyPackagePdf}
          />
        </Card>
      )}

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

      <Card id="dashboard-jobs" variant="soft">
        <h2 className="twin-section-title mb-4">
          {t("dashboard.jobs")}
          {jobs !== null ? ` (${jobs.total})` : ""}
        </h2>
        <JobFiltersBar
          filters={filters}
          options={filterOptions}
          onChange={setFilters}
          onApply={applyFilters}
        />
        {jobs === null ? (
          <div className="mt-3 space-y-3" aria-busy="true" aria-live="polite">
            <p className="twin-muted text-sm">{t("dashboard.jobsLoading")}</p>
            <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--twin-border)]/70" />
          </div>
        ) : (
          <>
            {jobs.total > 0 ? (
              <p className="twin-muted mb-2 text-xs leading-relaxed">
                {t("dashboard.jobsShowingSummary")
                  .replace("{shown}", String(jobs.items.length))
                  .replace("{total}", String(jobs.total))}
              </p>
            ) : null}
            <JobList
              items={jobs.items}
              showScore={hasProfile}
              applicationStatus={displayApplicationStatus}
              onApply={hasProfile ? applyToJob : undefined}
              onAutoApply={hasProfile ? autoApplyToJob : undefined}
              autoApplyJobId={autoApplyingId}
              onSave={hasProfile ? saveJob : undefined}
              onDismiss={hasProfile ? dismissJob : undefined}
            />
            {jobs.items.length < jobs.total ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={jobsLoadMoreBusy}
                  onClick={() => void loadMoreJobs()}
                  className="twin-btn-secondary twin-touch-target text-sm"
                >
                  {jobsLoadMoreBusy ? "…" : t("dashboard.jobsLoadMore")}
                </button>
              </div>
            ) : null}
            <p className="twin-muted mt-3 text-[11px] leading-relaxed">{t("dashboard.jobsCorpusNote")}</p>
          </>
        )}
        {jobs !== null && (jobs.total === 0 || jobs.items.length === 0) ? (
          <div className="mt-3 space-y-3 rounded-lg border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/35 p-4 sm:p-5">
            {jobs.total === 0 && jobFiltersAreDefault(filters) ? (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.jobsEmptyZeroTitle")}</p>
                <p className="twin-muted text-sm leading-relaxed">{t("dashboard.jobsEmptyZeroLead")}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/profile" className="twin-btn-solid twin-touch-target text-sm">
                    {t("dashboard.jobsEmptyZeroProfileCta")}
                  </Link>
                  {SHOW_SCRAPE_UI && user?.can_trigger_scrape ? (
                    <button
                      type="button"
                      className="twin-btn-secondary text-sm"
                      disabled={scraping}
                      onClick={() => void triggerScrapeAll()}
                    >
                      {scraping ? t("dashboard.scrapingAll") : t("dashboard.jobsEmptyZeroScrapeCta")}
                    </button>
                  ) : null}
                </div>
              </>
            ) : hasProfile ? (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.jobsEmptyFilteredTitle")}</p>
                <p className="twin-muted text-sm leading-relaxed">{t("dashboard.jobsEmptyFilteredLead")}</p>
                <button
                  type="button"
                  className="twin-btn-secondary text-sm"
                  onClick={() => {
                    setFilters(defaultJobFilters);
                    persistJobFilters(defaultJobFilters);
                  }}
                >
                  {t("dashboard.jobsEmptyZeroResetFilters")}
                </button>
              </>
            ) : (
              <>
                <p className="twin-muted text-sm">
                  {SHOW_SCRAPE_UI ? t("dashboard.noJobs") : t("dashboard.noJobsNoScrapeUi")}
                </p>
                <p className="twin-muted text-sm leading-relaxed">{t("dashboard.jobsEmptyMomentum")}</p>
                <Link href="/profile" className="twin-btn-solid twin-touch-target inline-block text-sm">
                  {t("dashboard.jobsEmptyZeroProfileCta")}
                </Link>
              </>
            )}
          </div>
        ) : null}
      </Card>

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
      <HelpWidget />
    </Shell>
  );
}
