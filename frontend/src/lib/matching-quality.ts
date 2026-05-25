/** Dashboard matching quality gate — keep in sync with docs/MATCHING_QUALITY_GATE.md */

export const DASHBOARD_MATCH_LIMIT = 50;
export const DASHBOARD_MATCH_MIN_SCORE = 45;
export const MAIN_RECOMMENDATION_MIN_SCORE = 40;

export type MatchQualityLabel = "excellent" | "good" | "possible" | "weak";

export type MatchFeedbackValue = "apply_intent" | "relevant" | "not_relevant" | "not_now";

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
