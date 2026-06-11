/** Stable DOM markers for recruiter inbox visual regression tests. */
export const RECRUITER_INBOX_VISUAL_MARKERS = {
  decisionConsoleHeader: "recruiter-inbox-decision-header",
  segmentTab: "recruiter-inbox-segment-tab",
  matchScoreBadge: "recruiter-inbox-match-score-badge",
  statusBadge: "recruiter-inbox-status-badge",
  reviewCardCta: "recruiter-inbox-review-card-cta",
  acceptButton: "recruiter-inbox-accept-btn",
  declineButton: "recruiter-inbox-decline-btn",
  evidenceChip: "recruiter-inbox-evidence-chip",
  warningChip: "recruiter-inbox-warning-chip",
} as const;

export type RecruiterInboxMatchScoreTone = "high" | "medium" | "low" | "unknown";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--twin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--twin-surface)]";

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
  const base = `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreBadge} inline-flex shrink-0 items-center rounded-xl border px-3 py-1.5 text-sm font-bold tabular-nums shadow-sm`;
  switch (tone) {
    case "high":
      return `${base} border-emerald-400/55 bg-emerald-400/22 text-emerald-950 dark:border-emerald-300/65 dark:bg-emerald-400/28 dark:text-emerald-50`;
    case "medium":
      return `${base} border-sky-400/55 bg-sky-400/22 text-sky-950 dark:border-sky-300/65 dark:bg-sky-400/28 dark:text-sky-50`;
    case "low":
      return `${base} border-amber-400/60 bg-amber-400/25 text-amber-950 dark:border-amber-300/70 dark:bg-amber-400/30 dark:text-amber-50`;
    default:
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-2)] text-[var(--foreground)]`;
  }
}

/** Awaiting-decision and similar status pills — readable on dark theme. */
export function recruiterInboxStatusBadgeClass(variant: "awaiting" | "accepted" | "declined"): string {
  const base = `${RECRUITER_INBOX_VISUAL_MARKERS.statusBadge} inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold`;
  switch (variant) {
    case "awaiting":
      return `${base} border-sky-400/55 bg-sky-400/20 text-sky-950 dark:border-sky-300/70 dark:bg-sky-400/28 dark:text-sky-50`;
    case "accepted":
      return `${base} border-emerald-400/55 bg-emerald-400/20 text-emerald-950 dark:border-emerald-300/70 dark:bg-emerald-400/28 dark:text-emerald-50`;
    case "declined":
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-2)] text-[var(--foreground)] dark:text-[var(--foreground)]`;
    default:
      return base;
  }
}

export function recruiterInboxEvidenceChipClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.evidenceChip} inline-flex max-w-full items-center rounded-lg border border-emerald-400/50 bg-emerald-400/18 px-2.5 py-1 text-xs font-medium leading-snug text-emerald-950 dark:border-emerald-300/60 dark:bg-emerald-400/22 dark:text-emerald-50`;
}

export function recruiterInboxWarningChipClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.warningChip} inline-flex max-w-full items-center rounded-lg border border-amber-400/55 bg-amber-400/20 px-2.5 py-1 text-xs font-medium leading-snug text-amber-950 dark:border-amber-300/65 dark:bg-amber-400/25 dark:text-amber-50`;
}

export function recruiterInboxNeutralChipClass(): string {
  return "inline-flex items-center rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-2.5 py-1 text-xs font-medium leading-snug text-[var(--foreground)]";
}

export function recruiterInboxReviewCardCtaClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.reviewCardCta} ${FOCUS_RING} inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/55 bg-emerald-400/18 px-3.5 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:border-emerald-400/70 hover:bg-emerald-400/28 dark:border-emerald-300/65 dark:bg-emerald-400/22 dark:text-emerald-50 dark:hover:bg-emerald-400/32`;
}

export function recruiterInboxDeclineButtonClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.declineButton} ${FOCUS_RING} rounded-lg border border-rose-400/45 bg-rose-400/12 px-3.5 py-2 text-sm font-semibold text-rose-900 transition-colors hover:border-rose-400/65 hover:bg-rose-400/20 dark:border-rose-300/55 dark:bg-rose-400/18 dark:text-rose-100 dark:hover:bg-rose-400/28`;
}

export function recruiterInboxSegmentTabFocusClass(): string {
  return FOCUS_RING;
}
