"use client";

import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { dashboardFetchUserMessage } from "@/components/dashboard/dashboard-helpers";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import {
  MAIN_RECOMMENDATION_MIN_SCORE,
  TOP_MATCHES_HIGHLIGHT_COUNT,
  type MatchFeedbackValue,
} from "@/lib/matching-quality";
import type {
  DashboardMatchItem,
  DashboardMatchList,
} from "@/components/dashboard/dashboard-helpers";

type Translator = (key: TranslationKey) => string;

type ApplicationByJobId = Record<number, string>;

interface UseDashboardMatchFeedbackArgs {
  t: Translator;
  setError: (msg: string | null) => void;
  matches: DashboardMatchList | null;
  setMatches: (
    update: (prev: DashboardMatchList | null) => DashboardMatchList | null,
  ) => void;
  applicationByJobId: ApplicationByJobId;
  setMatchFeedbackByJobId: (
    update: (
      prev: Record<number, MatchFeedbackValue>,
    ) => Record<number, MatchFeedbackValue>,
  ) => void;
  setMatchFeedbackBusyJobId: (jobId: number | null) => void;
}

/**
 * Bundles the dashboard's "match feedback" surface — the
 * `submitMatchFeedback` mutation that records a candidate's
 * `apply_intent` / `relevant` / `not_relevant` / `not_now` signal
 * against a match — together with the derived view-model the
 * `<MatchesSection/>` consumes (`visibleMatches`,
 * `topHighlightMatches`, `moreRecommendationMatches`). The
 * derivations live next to the mutation because they share the
 * same inputs (`matches`, `applicationByJobId`) and the same
 * invariant — "Nietrafione" (`not_relevant`) feedback hides a
 * card both in the live list and after a refresh.
 *
 * Mirrors the original behaviour 1:1: same endpoint
 * (`POST /api/v1/candidates/me/match-feedback`), same body
 * (`{ job_id, feedback_value }`), same toast
 * (`dashboard.matchFeedbackSaved`), same optimistic
 * `setMatches` filter on `not_relevant`, same
 * `setError(dashboardFetchUserMessage)` error path. No new copy,
 * no new endpoint, no new gating, no new "rejected" branch — the
 * `applicationByJobId[job.job_id] !== "rejected"` visibility
 * filter is preserved byte-for-byte (it shadows applied/rejected
 * cards from the top recommendations strip).
 */
export function useDashboardMatchFeedback({
  t,
  setError,
  matches,
  setMatches,
  applicationByJobId,
  setMatchFeedbackByJobId,
  setMatchFeedbackBusyJobId,
}: UseDashboardMatchFeedbackArgs) {
  const submitMatchFeedback = useCallback(
    async (jobId: number, value: MatchFeedbackValue) => {
      const token = getToken();
      if (!token) return;
      setMatchFeedbackBusyJobId(jobId);
      try {
        await apiFetch(
          "/api/v1/candidates/me/match-feedback",
          {
            method: "POST",
            body: JSON.stringify({ job_id: jobId, feedback_value: value }),
          },
          token,
        );
        setMatchFeedbackByJobId((prev) => ({ ...prev, [jobId]: value }));
        toast.success(t("dashboard.matchFeedbackSaved"));
        if (value === "not_relevant") {
          setMatches((prev) =>
            prev
              ? {
                  ...prev,
                  items: prev.items.filter((m) => m.job_id !== jobId),
                  total: Math.max(0, prev.total - 1),
                }
              : prev,
          );
        }
      } catch (err) {
        setError(dashboardFetchUserMessage(err, t));
      } finally {
        setMatchFeedbackBusyJobId(null);
      }
    },
    [
      t,
      setError,
      setMatches,
      setMatchFeedbackByJobId,
      setMatchFeedbackBusyJobId,
    ],
  );

  const visibleMatches: DashboardMatchItem[] = useMemo(() => {
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

  return {
    submitMatchFeedback,
    visibleMatches,
    topHighlightMatches,
    moreRecommendationMatches,
  } as const;
}
