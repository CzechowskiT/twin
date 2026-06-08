import { matchQualityLabel } from "@/lib/matching-quality";

import {
  isRecruiterInboxActionable,
  normalizeRecruiterInboxStatus,
} from "@/lib/recruiter-inbox-decision";

/** Decision console segment — maps match score/label + application status. */
export type RecruiterInboxSegment =
  | "all"
  | "strong_fit"
  | "good_fit"
  | "needs_verification"
  | "decided";

export const RECRUITER_INBOX_SEGMENTS: Exclude<RecruiterInboxSegment, "all">[] = [
  "strong_fit",
  "good_fit",
  "needs_verification",
  "decided",
];

export type RecruiterInboxSegmentRow = {
  status: string;
  match_score?: number | null;
  match_score_label?: string | null;
};

function normalizedMatchLabel(label: string | null | undefined): string {
  return (label ?? "").trim().toLowerCase();
}

/** Fit bucket for actionable rows; decided rows always map to `decided`. */
export function recruiterInboxSegment(row: RecruiterInboxSegmentRow): Exclude<RecruiterInboxSegment, "all"> {
  if (!isRecruiterInboxActionable(row.status)) return "decided";

  const label = normalizedMatchLabel(row.match_score_label);
  if (label === "excellent") return "strong_fit";
  if (label === "good") return "good_fit";
  if (label === "possible" || label === "weak") return "needs_verification";

  if (typeof row.match_score === "number") {
    const derived = matchQualityLabel(row.match_score);
    if (derived === "excellent") return "strong_fit";
    if (derived === "good") return "good_fit";
    return "needs_verification";
  }

  return "needs_verification";
}

export function recruiterInboxMatchesSegmentFilter(
  row: RecruiterInboxSegmentRow,
  filter: RecruiterInboxSegment,
): boolean {
  if (filter === "all") return true;
  return recruiterInboxSegment(row) === filter;
}

/** Rows still awaiting recruiter accept/decline. */
export function recruiterInboxAwaitingDecisionCount(rows: RecruiterInboxSegmentRow[]): number {
  return rows.filter((row) => isRecruiterInboxActionable(row.status)).length;
}

export function recruiterInboxSegmentCounts(
  rows: RecruiterInboxSegmentRow[],
): Record<Exclude<RecruiterInboxSegment, "all">, number> {
  const counts: Record<Exclude<RecruiterInboxSegment, "all">, number> = {
    strong_fit: 0,
    good_fit: 0,
    needs_verification: 0,
    decided: 0,
  };
  for (const row of rows) {
    counts[recruiterInboxSegment(row)] += 1;
  }
  return counts;
}

export function recruiterInboxStatusLabelKey(status: string): string | null {
  const s = normalizeRecruiterInboxStatus(status);
  if (s === "applied" || s === "pending") return "statusAwaitingDecision";
  if (s === "interview") return "statusAcceptedInterview";
  if (s === "rejected") return "statusDeclined";
  return null;
}
