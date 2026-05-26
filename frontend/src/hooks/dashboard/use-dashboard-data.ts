"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApplicationRow } from "@/components/applications-panel";
import {
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
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import {
  buildJobsQuery,
  defaultJobFilters,
  loadStoredJobFilters,
  persistJobFilters,
  type JobFilters,
} from "@/lib/jobs";
import {
  dashboardMatchesQuery,
  type MatchFeedbackValue,
} from "@/lib/matching-quality";
import { readStoredWebcalUrl } from "@/lib/webcal-subscribe";
import type { TranslationKey } from "@/lib/i18n";

type Translator = (key: TranslationKey) => string;

/**
 * Central dashboard data hook.
 *
 * Owns all "read-side" state for the candidate dashboard: identity,
 * profile, jobs, matches, applications, calendar strip, dev focus, filter
 * options, and the bootstrap / placement-verify / saved-filter effects.
 *
 * Mutations stay on the page (apply, save, dismiss, exports, polling) and
 * call into the setters/loaders this hook exposes. Splitting it this way
 * keeps `page.tsx` focused on composition without changing any user-facing
 * behavior.
 */
export function useDashboardData(t: Translator) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null | undefined>(undefined);
  const [matches, setMatches] = useState<DashboardMatchList | null>(null);
  const [jobs, setJobs] = useState<DashboardJobList | null>(null);
  const [feedStats, setFeedStats] = useState<DashboardFeedStats | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [devFocus, setDevFocus] = useState<DevelopmentFocus | null>(null);
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [filters, setFilters] = useState<JobFilters>(defaultJobFilters);
  const [titleFilterPrimed, setTitleFilterPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());
  const [dashboardCalendarBundle, setDashboardCalendarBundle] = useState<DashboardCalendarBundle | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [matchesRefreshing, setMatchesRefreshing] = useState(false);
  const [dashboardBootstrapping, setDashboardBootstrapping] = useState(true);
  const [matchFeedbackByJobId, setMatchFeedbackByJobId] = useState<Record<number, MatchFeedbackValue>>({});
  const [matchFeedbackBusyJobId, setMatchFeedbackBusyJobId] = useState<number | null>(null);
  const [placementEventsInvalidateKey, setPlacementEventsInvalidateKey] = useState(0);
  const [dashboardWebcalUrl, setDashboardWebcalUrl] = useState<string | null>(null);

  const bumpPlacementEventsInvalidateKey = useCallback(() => {
    setPlacementEventsInvalidateKey((k) => k + 1);
  }, []);

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

  // Bootstrap: auth, profile, filters, initial refresh.
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

  // Auto-prime title filter from profile preferred titles.
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

  // Handle ?placement_verify=<token> deep-link.
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

  // Restore persisted filters once.
  useEffect(() => {
    const restored = loadStoredJobFilters();
    if (restored) queueMicrotask(() => setFilters(restored));
  }, []);

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

  const applyJobFilters = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    persistJobFilters(filters);
    await refreshDashboardData(token, profile !== null && profile !== undefined, filters);
  }, [filters, profile, refreshDashboardData]);

  return {
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
  } as const;
}

export type UseDashboardData = ReturnType<typeof useDashboardData>;
