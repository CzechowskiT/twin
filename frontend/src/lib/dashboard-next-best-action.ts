import type { TranslationKey } from "@/lib/i18n";

/** Inputs for deterministic today / next-best-action — no invented analytics. */
export type DashboardTodayContext = {
  hasProfile: boolean;
  visibleMatchesCount: number;
  pipelineActiveCount: number;
  calendarConnected: boolean;
};

export type NextBestActionResult = {
  primaryHref: string;
  primaryLabelKey: TranslationKey;
  reasonKey: TranslationKey;
};

export type MissionCard = {
  id: "profile" | "matches" | "calendar";
  labelKey: TranslationKey;
  done: boolean;
};

/**
 * Priority: profile → matches available → calendar → pipeline → review matches.
 * Uses only fields present on the dashboard page today.
 */
export function resolveNextBestAction(ctx: DashboardTodayContext): NextBestActionResult {
  if (!ctx.hasProfile) {
    return {
      primaryHref: "/profile",
      primaryLabelKey: "dashboard.setupProfile",
      reasonKey: "dashboard.todayNbaReasonProfile",
    };
  }
  if (ctx.visibleMatchesCount === 0) {
    return {
      primaryHref: "/profile",
      primaryLabelKey: "dashboard.todayNbaRefineProfile",
      reasonKey: "dashboard.todayNbaReasonNoMatches",
    };
  }
  if (!ctx.calendarConnected) {
    return {
      primaryHref: "/dashboard/calendar",
      primaryLabelKey: "dashboard.todayNbaConnectCalendar",
      reasonKey: "dashboard.todayNbaReasonCalendar",
    };
  }
  if (ctx.pipelineActiveCount > 0) {
    return {
      primaryHref: "#dashboard-applications",
      primaryLabelKey: "dashboard.statApplicationsCta",
      reasonKey: "dashboard.todayNbaReasonPipeline",
    };
  }
  return {
    primaryHref: "#dashboard-matches",
    primaryLabelKey: "dashboard.statMatchesCta",
    reasonKey: "dashboard.todayNbaReasonMatches",
  };
}

export function buildMissionCards(ctx: DashboardTodayContext): MissionCard[] {
  return [
    { id: "profile", labelKey: "dashboard.todayMissionProfile", done: ctx.hasProfile },
    { id: "matches", labelKey: "dashboard.todayMissionMatches", done: ctx.visibleMatchesCount > 0 },
    { id: "calendar", labelKey: "dashboard.todayMissionCalendar", done: ctx.calendarConnected },
  ];
}

export function conversationReadinessKey(ctx: DashboardTodayContext): TranslationKey {
  if (!ctx.hasProfile) return "dashboard.todayReadinessSetup";
  if (ctx.visibleMatchesCount === 0) return "dashboard.todayReadinessWaiting";
  return "dashboard.todayReadinessReady";
}

export function isCalendarConnected(
  googleConnected: boolean | undefined,
  microsoftConnected: boolean | undefined,
): boolean {
  return Boolean(googleConnected || microsoftConnected);
}
