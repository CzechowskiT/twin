/** Stable DOM markers for recruiter inbox visual regression tests. */
export const RECRUITER_INBOX_VISUAL_MARKERS = {
  decisionConsoleHeader: "recruiter-inbox-decision-header",
  segmentTab: "recruiter-inbox-segment-tab",
  matchScoreBadge: "recruiter-inbox-match-score-badge",
  reviewCardCta: "recruiter-inbox-review-card-cta",
  acceptButton: "recruiter-inbox-accept-btn",
} as const;

export type RecruiterInboxMatchScoreTone = "high" | "medium" | "low" | "unknown";

/** Map score/label to decision-grade badge tone (no over-precision). */
export function recruiterInboxMatchScoreTone(
  score: number | null | undefined,
  label: string | null | undefined,
): RecruiterInboxMatchScoreTone {
  const key = (label ?? "").trim().toLowerCase();
  if (key === "excellent" || (typeof score === "number" && score >= 80)) return "high";
  if (key === "good" || (typeof score === "number" && score >= 60)) return "medium";
  if (key === "possible" || key === "weak" || (typeof score === "number" && score > 0)) return "low";
  return "unknown";
}

/** High-contrast palette for match score badges on dark surfaces. */
export function recruiterInboxMatchScoreBadgeClass(tone: RecruiterInboxMatchScoreTone): string {
  const base =
    "recruiter-inbox-match-score-badge inline-flex shrink-0 items-center rounded-xl border px-3 py-1.5 text-sm font-bold tabular-nums";
  switch (tone) {
    case "high":
      return `${base} border-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-50`;
    case "medium":
      return `${base} border-teal-500/40 bg-teal-500/15 text-teal-950 dark:border-teal-400/50 dark:bg-teal-500/20 dark:text-teal-50`;
    case "low":
      return `${base} border-amber-500/40 bg-amber-500/15 text-amber-950 dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-50`;
    default:
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-2)] text-[var(--foreground)]`;
  }
}
