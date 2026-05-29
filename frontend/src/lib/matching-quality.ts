/** Dashboard matching quality — keep in sync with docs/MATCHING_QUALITY_GATE.md */

export const DASHBOARD_MATCH_LIMIT = 200;
export const DASHBOARD_MATCH_MIN_SCORE = 38;
export const TOP_MATCHES_HIGHLIGHT_COUNT = 20;
export const MAIN_RECOMMENDATION_MIN_SCORE = 38;

export type MatchQualityLabel = "excellent" | "good" | "possible" | "weak";

export type MatchFeedbackValue = "apply_intent" | "relevant" | "not_relevant" | "not_now";

export type MatchBadgeId =
  | "direct_employer"
  | "fresh"
  | "high_fit"
  | "remote"
  | "salary_visible";

export function matchQualityLabel(score: number): MatchQualityLabel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "possible";
  return "weak";
}

export function dashboardMatchesQuery(): string {
  return `/api/v1/candidates/me/matches?limit=${DASHBOARD_MATCH_LIMIT}&min_score=${DASHBOARD_MATCH_MIN_SCORE}`;
}

export function dashboardMatchesExportQuery(): string {
  return `/api/v1/candidates/me/matches/export.csv?limit=${DASHBOARD_MATCH_LIMIT}&min_score=${DASHBOARD_MATCH_MIN_SCORE}`;
}

export function dashboardMatchesExportXlsxQuery(): string {
  return `/api/v1/candidates/me/matches/export.xlsx?limit=${DASHBOARD_MATCH_LIMIT}&min_score=${DASHBOARD_MATCH_MIN_SCORE}`;
}
