import type { TranslationKey } from "@/lib/i18n";

/** GlobJob three lanes from match score (docs/GLIMMER_GLOBJOB_GAP_ANALYSIS.md). */
export function matchLaneKeyFromScore(score: number): TranslationKey {
  if (score >= 80) return "dashboard.matchLaneIdeal";
  if (score >= 60) return "dashboard.matchLaneNear";
  return "dashboard.matchLaneStretch";
}
