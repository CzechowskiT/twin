"use client";

import type { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { dashboardFetchUserMessage } from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import { persistJobFilters, type JobFilters } from "@/lib/jobs";

type Translator = (key: TranslationKey) => string;
type Router = ReturnType<typeof useRouter>;

interface UseDashboardPollingArgs {
  t: Translator;
  router: Router;
  refreshDashboardData: (
    token: string,
    hasProfile: boolean,
    activeFilters: JobFilters,
    opts?: { light?: boolean },
  ) => Promise<number>;
  setError: (msg: string | null) => void;
  setFilters: (next: JobFilters) => void;
}

interface TriggerScrapeArgs {
  hasProfile: boolean;
  filters: JobFilters;
  jobsTotal: number;
}

/**
 * Encapsulates the "trigger scrape, then background-refresh until the
 * job list stabilises" lifecycle so the page does not have to keep four
 * separate refs and an inline 70-line setTimeout loop. Same toasts,
 * same scroll behaviour, same 12-minute cap as before.
 */
export function useDashboardPolling({
  t,
  router,
  refreshDashboardData,
  setError,
  setFilters,
}: UseDashboardPollingArgs) {
  const [scraping, setScraping] = useState(false);
  /** Background refresh after a queued scrape — button stays usable; feed updates on its own. */
  const [scrapePollActive, setScrapePollActive] = useState(false);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);

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

  const triggerScrapeAll = useCallback(
    async ({ hasProfile, filters, jobsTotal }: TriggerScrapeArgs) => {
      const token = getToken();
      if (!token) return;
      const pollFilters: JobFilters = { ...filters, title_terms: "" };
      if (pollFilters.title_terms !== filters.title_terms) {
        setFilters(pollFilters);
        persistJobFilters(pollFilters);
      }
      const baselineTotal = jobsTotal;
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
        if (hasProfile) {
          setShowApplyPrompt(true);
        }
        try {
          const lastTotal = await refreshDashboardData(token, hasProfile, pollFilters, { light: true });
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
              hasProfile,
              startedAt: Date.now(),
            };
            setScrapePollActive(true);
          } else {
            await refreshDashboardData(token, hasProfile, pollFilters);
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
    },
    [t, router, refreshDashboardData, setError, setFilters],
  );

  return {
    scraping,
    scrapePollActive,
    showApplyPrompt,
    setShowApplyPrompt,
    triggerScrapeAll,
  } as const;
}
