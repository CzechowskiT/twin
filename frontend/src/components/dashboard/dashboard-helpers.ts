import { isLikelyBrowserNetworkFailureMessage } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Shared types used across the dashboard page and its extracted sections.
 *
 * Kept here (not in `lib/`) because they describe the dashboard page's local
 * view-model: payload shapes returned by API calls + a handful of UI bundles
 * (calendar strip, development focus). Backend contract lives in API schemas;
 * this file only mirrors what the dashboard renders.
 */
export type DashboardUser = {
  id: number;
  email: string;
  plan_tier?: string;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  scrape_ops_configured?: boolean;
  scrape_ops_elevated?: boolean;
  can_trigger_scrape?: boolean;
  scrape_worker_ready?: boolean;
  mail_configured?: boolean;
  microsoft_calendar_oauth_configured?: boolean;
};

export type DashboardProfile = {
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

export type DashboardJobItem = {
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

export type DashboardJobList = {
  items: DashboardJobItem[];
  total: number;
  search_relaxed?: boolean;
};

export type DashboardFeedStats = {
  active_validated_jobs: number;
  last_scrape_run_at?: string | null;
  feed_stale?: boolean;
  market_update_label?: string | null;
};

export type DashboardMatchItem = {
  job_id: number;
  score: number;
  quality_label?: string | null;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
  source_label?: string | null;
  badges?: string[];
  match_reason?: string | null;
};

export type DashboardMatchList = { items: DashboardMatchItem[]; total: number };

export type DashboardFilterOptions = { job_boards: string[]; locations: string[] };

export type GoogleCalendarStrip = {
  connected: boolean;
  google_email: string | null;
  oauth_configured?: boolean;
  oauth_redirect_uri?: string | null;
};

export type MicrosoftCalendarStrip = {
  connected: boolean;
  microsoft_email: string | null;
  oauth_configured?: boolean;
};

export type DashboardCalendarBundle = {
  google: GoogleCalendarStrip;
  microsoft: MicrosoftCalendarStrip;
  nextInterview: {
    id: number;
    company_name: string;
    job_title: string;
    interview_start: string;
    interview_end: string;
    meeting_link: string | null;
    calendar_provider?: string | null;
  } | null;
};

export type DevelopmentFocus = {
  skill_tool_gaps: string[];
  positioning_themes: string[];
  stronger_candidate_signals: string[];
  upskill_actions_prioritized: { title: string; priority: string; rationale: string }[];
  roles_with_insights: {
    application_id: number;
    job_id: number;
    title: string;
    company: string;
    summary: string | null;
  }[];
};

/** Map API/proxy failures to actionable copy (Vercel ↔ Railway). */
export function dashboardFetchUserMessage(
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
  if (networkHint === "scrape" && (lc.includes("consent") || lc.includes("privacy"))) {
    return t("dashboard.scrapeConsentRequired");
  }
  if (networkHint === "scrape" && (lc.includes("503") || lc.includes("502") || lc.includes("unavailable"))) {
    return t("dashboard.scrapeUnavailable");
  }
  return raw.trim() || t("dashboard.scrapeFailed");
}

export function csvExportUserMessage(err: unknown, t: (key: TranslationKey) => string): string {
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

export function formatInterviewRangeShort(isoStart: string, isoEnd: string, locale: string): string {
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
