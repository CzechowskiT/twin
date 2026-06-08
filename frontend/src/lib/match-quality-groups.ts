import { matchQualityLabel, type MatchQualityLabel } from "@/lib/matching-quality";

export type MatchConfidenceGroupId = "strong_fit" | "worth_reviewing" | "low_confidence";

export type MatchConfidenceGroup<T extends { score: number }> = {
  id: MatchConfidenceGroupId;
  items: T[];
};

/** Map score to premium confidence bucket (reuses matchQualityLabel thresholds). */
export function matchConfidenceGroupId(score: number): MatchConfidenceGroupId {
  const label: MatchQualityLabel = matchQualityLabel(score);
  if (label === "excellent" || label === "good") return "strong_fit";
  if (label === "possible") return "worth_reviewing";
  return "low_confidence";
}

const GROUP_ORDER: MatchConfidenceGroupId[] = ["strong_fit", "worth_reviewing", "low_confidence"];

/** Split visible matches into Strong fit / Worth reviewing / Low confidence. */
export function groupMatchesByConfidence<T extends { score: number }>(items: T[]): MatchConfidenceGroup<T>[] {
  const buckets: Record<MatchConfidenceGroupId, T[]> = {
    strong_fit: [],
    worth_reviewing: [],
    low_confidence: [],
  };
  for (const item of items) {
    buckets[matchConfidenceGroupId(item.score)].push(item);
  }
  return GROUP_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    items: buckets[id],
  }));
}
