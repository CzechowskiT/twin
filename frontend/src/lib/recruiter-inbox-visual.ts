/** Stable DOM markers for recruiter inbox visual regression tests. */
export const RECRUITER_INBOX_VISUAL_MARKERS = {
  decisionConsoleHeader: "recruiter-inbox-decision-header",
  segmentTab: "recruiter-inbox-segment-tab",
  candidateCard: "recruiter-inbox-candidate-card",
  contentZone: "recruiter-inbox-content-zone",
  decisionRail: "recruiter-inbox-decision-rail",
  actionZone: "recruiter-inbox-action-zone",
  sectionLabel: "recruiter-inbox-section-label",
  matchScoreCard: "recruiter-inbox-match-score-card",
  matchScoreLabel: "recruiter-inbox-match-score-label",
  matchScoreValue: "recruiter-inbox-match-score-value",
  matchScoreTone: "recruiter-inbox-match-score-tone",
  /** @deprecated use matchScoreCard — kept for gradual test migration */
  matchScoreBadge: "recruiter-inbox-match-score-badge",
  statusBadge: "recruiter-inbox-status-badge",
  reviewCardCta: "recruiter-inbox-review-card-cta",
  acceptButton: "recruiter-inbox-accept-btn",
  declineButton: "recruiter-inbox-decline-btn",
  signalRow: "recruiter-inbox-signal-row",
  signalRowPositive: "recruiter-inbox-signal-row-positive",
  signalRowVerification: "recruiter-inbox-signal-row-verification",
  evidenceChip: "recruiter-inbox-evidence-chip",
  warningChip: "recruiter-inbox-warning-chip",
  chipMore: "recruiter-inbox-chip-more",
} as const;

export type RecruiterInboxMatchScoreTone = "high" | "medium" | "low" | "unknown";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--twin-surface)]";

const DECLINE_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--twin-surface)]";

/** Map score/label to decision-grade tone (no over-precision). */
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

/** Premium candidate card surface — lighter dark, subtle border. */
export function recruiterInboxCandidateCardClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.candidateCard} rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/95 px-5 py-5 text-base shadow-sm backdrop-blur-sm sm:px-6 sm:py-6`;
}

/** Right decision rail — light panel; color accents live on children. */
export function recruiterInboxDecisionRailClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.decisionRail} flex w-full shrink-0 flex-col gap-2 rounded-xl border border-[var(--twin-border)]/40 bg-[var(--twin-surface-raised)]/25 p-3 lg:w-56 xl:w-64`;
}

/** Section headings on candidate cards — sentence case, readable size. */
export function recruiterInboxSectionLabelClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.sectionLabel} text-sm font-semibold text-[var(--twin-muted-strong)]`;
}

function matchScoreToneTextClass(tone: RecruiterInboxMatchScoreTone): string {
  if (tone === "unknown") {
    return "text-[var(--twin-muted-strong)]";
  }
  // Tone color only on card border/bg — never on label text.
  return "text-[var(--foreground)]";
}

function matchScoreCardAccentClass(tone: RecruiterInboxMatchScoreTone): { border: string; bg: string } {
  switch (tone) {
    case "high":
      return { border: "border-emerald-400/30", bg: "bg-emerald-400/10" };
    case "medium":
      return { border: "border-cyan-400/30", bg: "bg-cyan-400/10" };
    case "low":
      return { border: "border-amber-400/35", bg: "bg-amber-400/12" };
    default:
      return { border: "border-[var(--twin-border)]/60", bg: "bg-[var(--twin-surface)]/35" };
  }
}

/** Match score card shell — label + value + tone as separate readable elements. */
export function recruiterInboxMatchScoreCardClass(tone: RecruiterInboxMatchScoreTone): string {
  const { border, bg } = matchScoreCardAccentClass(tone);
  return `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreCard} rounded-xl border ${border} ${bg} px-3.5 py-2.5`;
}

export function recruiterInboxMatchScoreLabelClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreLabel} text-xs font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]`;
}

export function recruiterInboxMatchScoreValueClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreValue} text-3xl font-bold tabular-nums leading-none tracking-tight text-[var(--foreground)]`;
}

export function recruiterInboxMatchScoreToneClass(tone: RecruiterInboxMatchScoreTone): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreTone} mt-1 text-sm font-semibold ${matchScoreToneTextClass(tone)}`;
}

/** @deprecated prefer recruiterInboxMatchScoreCardClass — kept for legacy tests */
export function recruiterInboxMatchScoreBadgeClass(
  tone: RecruiterInboxMatchScoreTone,
  opts?: { dominant?: boolean },
): string {
  const size = opts?.dominant
    ? "w-full justify-center px-4 py-2.5 text-xl sm:text-2xl"
    : "px-3 py-1.5 text-sm";
  const base = `${RECRUITER_INBOX_VISUAL_MARKERS.matchScoreBadge} inline-flex shrink-0 items-center rounded-xl border font-bold tabular-nums shadow-sm ${size}`;
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

/** Awaiting-decision and similar status pills — foreground text; tone via border/bg only. */
export function recruiterInboxStatusBadgeClass(variant: "awaiting" | "accepted" | "declined"): string {
  const base = `${RECRUITER_INBOX_VISUAL_MARKERS.statusBadge} inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]`;
  switch (variant) {
    case "awaiting":
      return `${base} border-cyan-400/50 bg-cyan-500/15`;
    case "accepted":
      return `${base} border-emerald-400/50 bg-emerald-500/15`;
    case "declined":
      return `${base} border-rose-400/50 bg-rose-500/15`;
    default:
      return base;
  }
}

export function recruiterInboxSignalRowClass(kind: "positive" | "verification" | "neutral"): string {
  const marker =
    kind === "positive"
      ? RECRUITER_INBOX_VISUAL_MARKERS.signalRowPositive
      : kind === "verification"
        ? RECRUITER_INBOX_VISUAL_MARKERS.signalRowVerification
        : RECRUITER_INBOX_VISUAL_MARKERS.signalRow;
  const base = `${marker} flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm leading-snug`;
  switch (kind) {
    case "positive":
      return `${base} border-emerald-400/30 bg-emerald-400/8 text-[var(--foreground)] dark:border-emerald-300/35 dark:bg-emerald-400/10`;
    case "verification":
      return `${base} border-amber-400/35 bg-amber-400/10 text-[var(--foreground)] dark:border-amber-300/40 dark:bg-amber-400/12`;
    default:
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 text-[var(--foreground)]`;
  }
}

export function recruiterInboxSignalOverflowClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.chipMore} text-sm font-medium text-[var(--twin-muted-strong)]`;
}

export function recruiterInboxEvidenceChipClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.evidenceChip} inline-flex max-w-full items-center rounded-lg border border-emerald-400/50 bg-emerald-400/18 px-3 py-1.5 text-sm font-medium leading-snug text-emerald-950 dark:border-emerald-300/60 dark:bg-emerald-400/22 dark:text-emerald-50`;
}

export function recruiterInboxWarningChipClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.warningChip} inline-flex max-w-full items-center rounded-lg border border-amber-400/55 bg-amber-400/20 px-3 py-1.5 text-sm font-medium leading-snug text-amber-950 dark:border-amber-300/65 dark:bg-amber-400/25 dark:text-amber-50`;
}

export function recruiterInboxNeutralChipClass(): string {
  return "inline-flex items-center rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-3 py-1.5 text-sm font-medium leading-snug text-[var(--foreground)]";
}

export function recruiterInboxChipMoreClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.chipMore} inline-flex items-center rounded-lg border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 px-3 py-1.5 text-sm font-medium text-[var(--twin-muted-strong)]`;
}

/** Review CTA — foreground label; cyan accent on border/bg/chevron only. */
export function recruiterInboxReviewCardCtaClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.reviewCardCta} ${FOCUS_RING} flex w-full items-center justify-between gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-cyan-400/65 hover:bg-cyan-500/22`;
}

/** Chevron icon accent for review CTA — bright cyan on dark surfaces, never the label. */
export function recruiterInboxReviewCardCtaIconClass(): string {
  return "h-4 w-4 shrink-0 text-cyan-300 transition-transform";
}

export function recruiterInboxDeclineButtonClass(): string {
  return `${RECRUITER_INBOX_VISUAL_MARKERS.declineButton} ${DECLINE_FOCUS_RING} rounded-lg border border-rose-400/50 bg-rose-500/15 px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-rose-400/65 hover:bg-rose-500/24`;
}

export function recruiterInboxSegmentTabFocusClass(): string {
  return FOCUS_RING;
}
