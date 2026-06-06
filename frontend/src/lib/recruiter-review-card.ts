/** Recruiter inbox review card — typed API shape + label helpers (no UI strings). */

export type RecruiterReviewCard = {
  why_this_candidate: string;
  requirements_matched: string[];
  uncertain_or_missing: string[];
  what_to_verify: string[];
  data_confidence: "high" | "medium" | "low" | "unknown";
  red_flags: string[];
  human_decision_required: boolean;
  disclaimer: string;
};

export type ReviewCardSectionKey =
  | "whyThisCandidate"
  | "requirementsMatched"
  | "uncertainOrMissing"
  | "whatToVerify"
  | "dataConfidence"
  | "redFlags"
  | "humanDecision"
  | "disclaimer";

export const REVIEW_CARD_SECTIONS: ReviewCardSectionKey[] = [
  "whyThisCandidate",
  "requirementsMatched",
  "uncertainOrMissing",
  "whatToVerify",
  "dataConfidence",
  "redFlags",
  "humanDecision",
  "disclaimer",
];

export function reviewCardDataConfidenceKey(
  value: RecruiterReviewCard["data_confidence"] | string | null | undefined,
): "reviewDataConfidenceHigh" | "reviewDataConfidenceMedium" | "reviewDataConfidenceLow" | "reviewDataConfidenceUnknown" {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "high") return "reviewDataConfidenceHigh";
  if (v === "medium") return "reviewDataConfidenceMedium";
  if (v === "low") return "reviewDataConfidenceLow";
  return "reviewDataConfidenceUnknown";
}

export function reviewCardSectionItems(
  card: RecruiterReviewCard,
  section: ReviewCardSectionKey,
): string[] {
  switch (section) {
    case "whyThisCandidate":
      return card.why_this_candidate ? [card.why_this_candidate] : [];
    case "requirementsMatched":
      return card.requirements_matched ?? [];
    case "uncertainOrMissing":
      return card.uncertain_or_missing ?? [];
    case "whatToVerify":
      return card.what_to_verify ?? [];
    case "dataConfidence":
      return card.data_confidence ? [card.data_confidence] : [];
    case "redFlags":
      return card.red_flags ?? [];
    case "humanDecision":
      return card.human_decision_required ? ["true"] : [];
    case "disclaimer":
      return card.disclaimer ? [card.disclaimer] : [];
    default:
      return [];
  }
}
