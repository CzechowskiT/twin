"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import toast from "react-hot-toast";
import type { ApplicationRow } from "@/components/applications-panel";
import {
  dashboardFetchUserMessage,
  type DashboardJobList,
  type DevelopmentFocus,
} from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import { JOB_FEED_PAGE_MAX, type JobFilters } from "@/lib/jobs";

type Translator = (key: TranslationKey) => string;

interface UseDashboardJobListActionsArgs {
  t: Translator;
  setError: (msg: string | null) => void;
  jobs: DashboardJobList | null;
  setJobs: Dispatch<SetStateAction<DashboardJobList | null>>;
  filters: JobFilters;
  loadJobs: (
    token: string,
    activeFilters: JobFilters,
    opts?: { skip?: number; limit?: number },
  ) => Promise<DashboardJobList>;
  savedJobIds: Set<number>;
  setSavedJobIds: Dispatch<SetStateAction<Set<number>>>;
  applicationByJobId: Record<number, string>;
  setJobApplication: (jobId: number, status: string) => void | Promise<void>;
  loadApplications: (
    token: string,
  ) => Promise<{ items: ApplicationRow[]; total: number }>;
  loadDevelopmentFocus: (token: string) => Promise<DevelopmentFocus | null>;
  syncApplicationsFromApi: (payload: {
    items: ApplicationRow[];
    total: number;
  }) => void;
  setDevFocus: (focus: DevelopmentFocus | null) => void;
}

/**
 * Bundles the candidate dashboard's "job list" mutation handlers — bookmark
 * (saveJob), dismiss (dismissJob), link-open tracking (trackLinkOpened),
 * and paginated jobs feed (loadMoreJobs) — plus the jobsLoadMoreBusy
 * machine that only gates the "load more" button. Mirrors the original
 * behaviour 1:1 — same endpoints, same payload shapes, same toasts, same
 * error mapping via dashboardFetchUserMessage, same refresh chain
 * (loadApplications + loadDevelopmentFocus + syncApplicationsFromApi).
 *
 * Note: this hook intentionally does NOT own apply / auto-apply /
 * setJobApplication / autoApplyingId — those mutations stay on the page
 * (and on the in-progress applications hook) because they participate in
 * the "send an application" surface that's gated separately. `dismissJob`
 * therefore receives `setJobApplication` as a callback so the "rejected"
 * branch keeps its original semantics without lifting that mutation here.
 */
export function useDashboardJobListActions({
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
}: UseDashboardJobListActionsArgs) {
  const [jobsLoadMoreBusy, setJobsLoadMoreBusy] = useState(false);

  const loadMoreJobs = useCallback(async () => {
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
  }, [t, setError, jobs, filters, loadJobs, setJobs]);

  const trackLinkOpened = useCallback(
    async (jobId: number) => {
      const token = getToken();
      if (!token) return;
      try {
        const idem =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "";
        const h = new Headers();
        if (idem) h.set("Idempotency-Key", idem);
        await apiFetch(
          "/api/v1/applications/",
          {
            method: "POST",
            body: JSON.stringify({
              job_id: jobId,
              status: "pending",
              track_link_opened: true,
            }),
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
    },
    [
      t,
      setError,
      syncApplicationsFromApi,
      loadApplications,
      setDevFocus,
      loadDevelopmentFocus,
    ],
  );

  const saveJob = useCallback(
    (jobId: number) => {
      const token = getToken();
      if (!token) return;
      void (async () => {
        try {
          await apiFetch(
            `/api/v1/jobs/saved/${jobId}`,
            { method: "POST" },
            token,
          );
          setSavedJobIds((prev) => new Set(prev).add(jobId));
          toast.success(t("dashboard.jobBookmarkedToast"));
        } catch (err) {
          setError(dashboardFetchUserMessage(err, t));
          toast.error(t("dashboard.jobBookmarkFailedToast"));
        }
      })();
    },
    [t, setError, setSavedJobIds],
  );

  const dismissJob = useCallback(
    (jobId: number) => {
      const token = getToken();
      if (!token) return;
      const statusForJob = applicationByJobId[jobId];
      if (savedJobIds.has(jobId) && !statusForJob) {
        void (async () => {
          try {
            await apiFetch(
              `/api/v1/jobs/saved/${jobId}`,
              { method: "DELETE" },
              token,
            );
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
    },
    [
      t,
      setError,
      savedJobIds,
      setSavedJobIds,
      applicationByJobId,
      setJobApplication,
    ],
  );

  return {
    jobsLoadMoreBusy,
    loadMoreJobs,
    trackLinkOpened,
    saveJob,
    dismissJob,
  } as const;
}
