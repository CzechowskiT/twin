"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationsPanel, type ApplicationRow, type FeedbackBusy } from "@/components/applications-panel";
import { DashboardCommandCenter } from "@/components/dashboard-command-center";
import { InvestorRoadmapPanel } from "@/components/investor-roadmap-panel";
import { useTranslation } from "@/components/language-provider";
import { JobFiltersBar } from "@/components/job-filters";
import { JobList } from "@/components/job-list";
import { ButtonCta, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { SHOW_SCRAPE_UI } from "@/lib/features";
import { buildJobsQuery, defaultJobFilters, type JobFilters } from "@/lib/jobs";

type User = {
  id: number;
  email: string;
  plan_tier?: string;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
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

type DevelopmentFocus = {
  skill_tool_gaps: string[];
  positioning_themes: string[];
  stronger_candidate_signals: string[];
  upskill_actions_prioritized: { title: string; priority: string; rationale: string }[];
  roles_with_insights: { application_id: number; job_id: number; title: string; company: string; summary: string | null }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [matches, setMatches] = useState<MatchList | null>(null);
  const [jobs, setJobs] = useState<JobList | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [devFocus, setDevFocus] = useState<DevelopmentFocus | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState<FeedbackBusy>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<JobFilters>(defaultJobFilters);
  const [titleFilterPrimed, setTitleFilterPrimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [autoApplyingId, setAutoApplyingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);

  const loadJobs = useCallback(async (token: string, activeFilters: JobFilters) => {
    return apiFetch<JobList>(`/api/v1/jobs/${buildJobsQuery(activeFilters)}`, {}, token);
  }, []);

  const loadMatches = useCallback(async (token: string) => {
    return apiFetch<MatchList>("/api/v1/candidates/me/matches?limit=220&min_score=18", {}, token);
  }, []);

  const loadApplications = useCallback(async (token: string) => {
    const data = await apiFetch<{ items: ApplicationRow[] }>("/api/v1/applications/me", {}, token);
    return data.items;
  }, []);

  const loadDevelopmentFocus = useCallback(async (token: string) => {
    try {
      return await apiFetch<DevelopmentFocus>("/api/v1/applications/me/development-focus", {}, token);
    } catch {
      return null;
    }
  }, []);

  const refreshDashboardData = useCallback(
    async (token: string, hasProfile: boolean, activeFilters: JobFilters) => {
      const [jobList, matchList, apps, focus] = await Promise.all([
        loadJobs(token, activeFilters),
        hasProfile ? loadMatches(token) : Promise.resolve(null),
        hasProfile ? loadApplications(token) : Promise.resolve([]),
        hasProfile ? loadDevelopmentFocus(token) : Promise.resolve(null),
      ]);
      setJobs(jobList);
      if (matchList) setMatches(matchList);
      setApplications(apps);
      setDevFocus(focus);
      setLastUpdated(new Date());
    },
    [loadJobs, loadMatches, loadApplications, loadDevelopmentFocus],
  );

  const applicationByJobId = useMemo(() => {
    const map: Record<number, string> = {};
    for (const app of applications) {
      map[app.job_id] = app.status;
    }
    return map;
  }, [applications]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
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
        setError(e instanceof Error ? e.message : t("dashboard.scrapeFailed"));
      }

      try {
        await refreshDashboardData(token, hasProfile, defaultJobFilters);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("dashboard.scrapeFailed"));
      }
    })();

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

  async function applyFilters() {
    const token = getToken();
    if (!token) return;
    await refreshDashboardData(token, profile !== null && profile !== undefined, filters);
  }

  async function setJobApplication(jobId: number, status: string) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        "/api/v1/applications/",
        {
          method: "POST",
          body: JSON.stringify({ job_id: jobId, status }),
        },
        token,
      );
      setApplications(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    }
  }

  function applyToJob(jobId: number, url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    void setJobApplication(jobId, "applied");
  }

  function saveJob(jobId: number) {
    void setJobApplication(jobId, "pending");
  }

  function dismissJob(jobId: number) {
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
      }>(
        "/api/v1/applications/auto-apply",
        { method: "POST", body: JSON.stringify({ job_id: jobId }) },
        token,
      );
      setApplications(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
      alert(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    } finally {
      setAutoApplyingId(null);
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
    setApplications(await loadApplications(token));
    setDevFocus(await loadDevelopmentFocus(token));
  }

  async function removeApplication(id: number) {
    const token = getToken();
    if (!token) return;
    await apiFetch(`/api/v1/applications/${id}`, { method: "DELETE" }, token);
    setApplications(await loadApplications(token));
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
      setApplications(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
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
      setApplications(await loadApplications(token));
      setDevFocus(await loadDevelopmentFocus(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    } finally {
      setFeedbackBusy(null);
    }
  }

  async function triggerScrapeAll() {
    const token = getToken();
    if (!token) return;
    setError(null);
    setScraping(true);
    try {
      const result = await apiFetch<{ message: string }>(
        "/api/v1/jobs/scrape/all?sync=true",
        { method: "POST" },
        token,
      );
      await refreshDashboardData(token, profile !== null && profile !== undefined, filters);
      alert(result.message || t("dashboard.scrapeFinished"));
      if (profile !== null && profile !== undefined) {
        setShowApplyPrompt(true);
        queueMicrotask(() => {
          document.getElementById("dashboard-matches")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    } finally {
      setScraping(false);
    }
  }

  const pipelineActiveCount = useMemo(
    () => applications.filter((a) => a.status !== "rejected").length,
    [applications],
  );

  const hasProfile = profile !== null && profile !== undefined;

  return (
    <Shell wide rail>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
          {t("dashboard.title")}
        </h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
          <Link href="/profile" className="twin-link twin-touch-target text-center text-sm sm:text-left">
            {t("nav.profile")}
          </Link>
          <Link href="/dashboard/career" className="twin-link twin-touch-target text-center text-sm sm:text-left">
            {t("dashboard.careerCompassLink")}
          </Link>
          <Link href="/dashboard/billing" className="twin-link twin-touch-target text-center text-sm sm:text-left">
            {t("dashboard.billingLink")}
          </Link>
          <Link href="/dashboard/identity" className="twin-link twin-touch-target text-center text-sm sm:text-left">
            {t("dashboard.identityLink")}
          </Link>
          <Link href="/dashboard/calendar" className="twin-link twin-touch-target text-center text-sm sm:text-left">
            {t("dashboard.calendarLink")}
          </Link>
          <button
            type="button"
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
            className="twin-btn-secondary twin-touch-target !w-full text-center sm:!w-auto"
          >
            {t("dashboard.logout")}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("dashboard.northStarEyebrow")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.northStarLead")}</p>
      </div>

      {user ? (
        <DashboardCommandCenter
          email={user.email}
          profileName={profile ? profile.name : undefined}
          hasProfile={hasProfile}
          showScrapeUi={SHOW_SCRAPE_UI}
          jobsTotal={jobs?.total ?? 0}
          matchesVisible={visibleMatches.length}
          applicationsActive={pipelineActiveCount}
        />
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
              <>
                <p className="twin-muted text-sm">{t("dashboard.signedInAs")}</p>
                <p className="break-all text-base font-medium sm:text-lg">{user.email}</p>
              </>
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
                onClick={() => triggerScrapeAll()}
                disabled={scraping}
                className="!mt-4 !rounded-full !py-3.5 !text-base !font-bold !tracking-tight !shadow-lg"
              >
                {scraping ? t("dashboard.twinForYourJobRunning") : t("dashboard.twinForYourJob")}
              </ButtonCta>
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

      {hasProfile && (matches?.items.length ?? 0) > 0 && (
        <Card id="dashboard-matches" variant="soft">
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
          <h2 className="twin-section-title mb-4">
            {t("dashboard.topMatches")} ({matches?.total ?? 0})
          </h2>
          <JobList
            items={visibleMatches}
            showScore
            applicationStatus={applicationByJobId}
            onApply={applyToJob}
            onAutoApply={autoApplyToJob}
            autoApplyJobId={autoApplyingId}
            onSave={saveJob}
            onDismiss={dismissJob}
          />
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
          <h2 className="twin-section-title mb-4">
            {t("dashboard.applications")} ({applications.length})
          </h2>
          <ApplicationsPanel
            items={applications}
            onStatusChange={updateApplicationStatus}
            onRemove={removeApplication}
            onSaveFeedback={saveApplicationFeedback}
            onParseFeedback={parseApplicationFeedback}
            feedbackBusy={feedbackBusy}
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
          {t("dashboard.jobs")} ({jobs?.total ?? 0})
        </h2>
        <JobFiltersBar
          filters={filters}
          options={filterOptions}
          onChange={setFilters}
          onApply={applyFilters}
        />
        <JobList
          items={jobs?.items ?? []}
          applicationStatus={applicationByJobId}
          onApply={hasProfile ? applyToJob : undefined}
          onAutoApply={hasProfile ? autoApplyToJob : undefined}
          autoApplyJobId={autoApplyingId}
          onSave={hasProfile ? saveJob : undefined}
          onDismiss={hasProfile ? dismissJob : undefined}
        />
        {!jobs?.items.length && (
          <div className="mt-3 space-y-2 rounded-lg border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/35 p-4 sm:p-5">
            <p className="twin-muted text-sm">
              {SHOW_SCRAPE_UI ? t("dashboard.noJobs") : t("dashboard.noJobsNoScrapeUi")}
            </p>
            <p className="twin-muted text-sm leading-relaxed">{t("dashboard.jobsEmptyMomentum")}</p>
          </div>
        )}
      </Card>
    </Shell>
  );
}
