"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApplicationsPanel, type ApplicationRow } from "@/components/applications-panel";
import { useTranslation } from "@/components/language-provider";
import { JobFiltersBar } from "@/components/job-filters";
import { JobList } from "@/components/job-list";
import { ButtonChip, ButtonCta, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { groupBoardsByRegion, regionLabelKey } from "@/lib/job-board-regions";
import { SHOW_SCRAPE_UI } from "@/lib/features";
import { buildJobsQuery, defaultJobFilters, type JobFilters } from "@/lib/jobs";

type User = { id: number; email: string };
type Profile = {
  name: string;
  skills: string[];
  experience_years: number;
  desired_salary: number | null;
  location: string | null;
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
type BoardItem = { id: string; label: string; region: string };
type BoardList = { items: BoardItem[] };
type FilterOptions = { job_boards: string[]; locations: string[] };

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [matches, setMatches] = useState<MatchList | null>(null);
  const [jobs, setJobs] = useState<JobList | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [boards, setBoards] = useState<BoardList | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<JobFilters>(defaultJobFilters);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [autoApplyingId, setAutoApplyingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadJobs = useCallback(async (token: string, activeFilters: JobFilters) => {
    return apiFetch<JobList>(`/api/v1/jobs/${buildJobsQuery(activeFilters)}`, {}, token);
  }, []);

  const loadMatches = useCallback(async (token: string) => {
    return apiFetch<MatchList>("/api/v1/candidates/me/matches?limit=15&min_score=28", {}, token);
  }, []);

  const loadApplications = useCallback(async (token: string) => {
    const data = await apiFetch<{ items: ApplicationRow[] }>("/api/v1/applications/me", {}, token);
    return data.items;
  }, []);

  const refreshDashboardData = useCallback(
    async (token: string, hasProfile: boolean, activeFilters: JobFilters) => {
      const [jobList, matchList, apps] = await Promise.all([
        loadJobs(token, activeFilters),
        hasProfile ? loadMatches(token) : Promise.resolve(null),
        hasProfile ? loadApplications(token) : Promise.resolve([]),
      ]);
      setJobs(jobList);
      if (matchList) setMatches(matchList);
      setApplications(apps);
      setLastUpdated(new Date());
    },
    [loadJobs, loadMatches, loadApplications],
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
    apiFetch<User>("/api/v1/auth/me", {}, token)
      .then(async (u) => {
        setUser(u);
        let hasProfile = false;
        try {
          const p = await apiFetch<Profile>("/api/v1/candidates/me", {}, token);
          setProfile(p);
          hasProfile = true;
        } catch {
          setProfile(null);
        }
        const opts = await apiFetch<FilterOptions>("/api/v1/jobs/filters", {}, token);
        setFilterOptions(opts);
        if (SHOW_SCRAPE_UI) {
          const boardList = await apiFetch<BoardList>("/api/v1/jobs/boards", {}, token);
          setBoards(boardList);
        } else {
          setBoards(null);
        }
        await refreshDashboardData(token, hasProfile, filters);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, [router]);

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

  async function updateApplicationStatus(id: number, status: string) {
    const token = getToken();
    if (!token) return;
    await apiFetch(
      `/api/v1/applications/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      token,
    );
    setApplications(await loadApplications(token));
  }

  async function removeApplication(id: number) {
    const token = getToken();
    if (!token) return;
    await apiFetch(`/api/v1/applications/${id}`, { method: "DELETE" }, token);
    setApplications(await loadApplications(token));
  }

  async function triggerScrape(boardId: string) {
    const token = getToken();
    if (!token) return;
    setError(null);
    setScraping(true);
    try {
      const result = await apiFetch<{ message: string }>(
        `/api/v1/jobs/scrape/${boardId}?sync=true`,
        { method: "POST" },
        token,
      );
      await refreshDashboardData(token, profile !== null && profile !== undefined, filters);
      alert(result.message || t("dashboard.scrapeFinished"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    } finally {
      setScraping(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.scrapeFailed"));
    } finally {
      setScraping(false);
    }
  }

  const hasProfile = profile !== null && profile !== undefined;

  return (
    <Shell wide>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">
          {t("dashboard.title")}
        </h1>
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
            <div className="twin-card-inset w-full shrink-0 p-4 sm:p-5 lg:max-w-md">
              <p className="mb-2 text-sm font-medium">{t("dashboard.scrapeJobs")}</p>
              <ButtonCta
                type="button"
                onClick={() => triggerScrapeAll()}
                disabled={scraping}
                className="mb-3 !w-full"
              >
                {scraping ? t("dashboard.scrapingAll") : t("dashboard.scrapeAll")}
              </ButtonCta>
              {boards && (
                <div className="twin-filter-box space-y-3">
                  {groupBoardsByRegion(boards.items).map(({ region, boards: regionBoards }) => (
                    <section
                      key={region}
                      className="border-b border-[var(--twin-border)] pb-3 last:border-0 last:pb-0"
                    >
                      <h3 className="twin-region-label mb-1.5">{t(regionLabelKey(region))}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {regionBoards.map((btn) => (
                          <ButtonChip
                            key={btn.id}
                            onClick={() => triggerScrape(btn.id)}
                            disabled={scraping}
                          >
                            {scraping ? t("dashboard.scraping") : btn.label}
                          </ButtonChip>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <p className="twin-muted mt-2 text-xs">{t("dashboard.keepApiOpen")}</p>
            </div>
          )}
        </div>
      </Card>

      {hasProfile && (matches?.items.length ?? 0) > 0 && (
        <Card variant="soft">
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
        <Card variant="soft">
          <h2 className="twin-section-title mb-4">
            {t("dashboard.applications")} ({applications.length})
          </h2>
          <ApplicationsPanel
            items={applications}
            onStatusChange={updateApplicationStatus}
            onRemove={removeApplication}
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

      <Card variant="soft">
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
          <p className="twin-muted mt-3 text-sm">{t("dashboard.noJobs")}</p>
        )}
      </Card>
    </Shell>
  );
}
