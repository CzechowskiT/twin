/** Premium Talent Radar cockpit — fit bands, grouping, summary stats, visual tokens. */

import type { TalentRadarCandidate } from "./recruiter-talent-radar";

export const TALENT_RADAR_VISUAL_MARKERS = {
  summaryPanel: "recruiter-talent-radar-summary-panel",
  summaryStat: "recruiter-talent-radar-summary-stat",
  filterToolbar: "recruiter-talent-radar-filter-toolbar",
  candidateGroup: "recruiter-talent-radar-candidate-group",
  fitBadge: "recruiter-talent-radar-fit-badge",
  candidateCardHeader: "recruiter-talent-radar-card-header",
  candidateCardChipGroup: "recruiter-talent-radar-card-chip-group",
  candidateCardDetails: "recruiter-talent-radar-card-details",
  candidateCardDetailsPanel: "recruiter-talent-radar-card-details-panel",
  candidateCardCtaRow: "recruiter-talent-radar-card-cta-row",
  evidenceBadge: "recruiter-talent-radar-evidence-badge",
  primaryCta: "recruiter-talent-radar-primary-cta",
  secondaryCta: "recruiter-talent-radar-secondary-cta",
  tertiaryCta: "recruiter-talent-radar-tertiary-cta",
  draftModalOverlay: "recruiter-talent-radar-draft-modal-overlay",
  draftModalPanel: "recruiter-talent-radar-draft-modal-panel",
  draftCopyOnlyBadge: "recruiter-talent-radar-draft-copy-only-badge",
  draftMessageBox: "recruiter-talent-radar-draft-message-box",
  draftCtaRow: "recruiter-talent-radar-draft-cta-row",
  trustFooter: "recruiter-talent-radar-trust-footer",
} as const;

/** Fit score bands: Strong 80–100, Good 60–79, Possible 40–59, Low 0–39. */
export type TalentRadarFitBand = "strong" | "good" | "possible" | "low";

export function talentRadarFitBandFromScore(score: number): TalentRadarFitBand {
  if (score >= 80) return "strong";
  if (score >= 60) return "good";
  if (score >= 40) return "possible";
  return "low";
}

export function talentRadarFitBandRange(band: TalentRadarFitBand): string {
  switch (band) {
    case "strong":
      return "80–100";
    case "good":
      return "60–79";
    case "possible":
      return "40–59";
    default:
      return "0–39";
  }
}

/** Decision cockpit review groups — priority-ordered assignment. */
export type TalentRadarReviewGroup =
  | "review_first"
  | "possible_match"
  | "needs_verification"
  | "low_confidence";

const REVIEW_GROUP_ORDER: TalentRadarReviewGroup[] = [
  "review_first",
  "possible_match",
  "needs_verification",
  "low_confidence",
];

export function talentRadarReviewGroup(candidate: TalentRadarCandidate): TalentRadarReviewGroup {
  if (
    candidate.status === "needs_verification" ||
    candidate.status === "consent_check_required"
  ) {
    return "needs_verification";
  }
  if (
    candidate.data_confidence === "low" ||
    candidate.status === "stale_data" ||
    candidate.status === "not_enough_evidence" ||
    candidate.score < 40
  ) {
    return "low_confidence";
  }
  if (candidate.score >= 80) {
    return "review_first";
  }
  return "possible_match";
}

export function groupTalentRadarCandidates(
  rows: TalentRadarCandidate[],
): Record<TalentRadarReviewGroup, TalentRadarCandidate[]> {
  const buckets: Record<TalentRadarReviewGroup, TalentRadarCandidate[]> = {
    review_first: [],
    possible_match: [],
    needs_verification: [],
    low_confidence: [],
  };
  for (const row of rows) {
    buckets[talentRadarReviewGroup(row)].push(row);
  }
  return buckets;
}

export type TalentRadarSummaryStats = {
  total: number;
  strongMatches: number;
  needsVerification: number;
  lowConfidence: number;
};

export function computeTalentRadarSummaryStats(
  rows: TalentRadarCandidate[],
): TalentRadarSummaryStats {
  return {
    total: rows.length,
    strongMatches: rows.filter((r) => r.score >= 80).length,
    needsVerification: rows.filter(
      (r) => r.status === "needs_verification" || r.status === "consent_check_required",
    ).length,
    lowConfidence: rows.filter(
      (r) =>
        r.data_confidence === "low" ||
        r.status === "stale_data" ||
        r.status === "not_enough_evidence",
    ).length,
  };
}

export function talentRadarReviewGroupOrder(): readonly TalentRadarReviewGroup[] {
  return REVIEW_GROUP_ORDER;
}

/** Premium card surface — opaque panel, no glass over dense copy. */
export function talentRadarCandidateCardClass(): string {
  return "rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)] shadow-md";
}

/** Strong modal scrim — blocks readable bleed-through from cards behind. */
export function talentRadarModalOverlayClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.draftModalOverlay} fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md`;
}

/** Solid modal panel — no translucent glass over message text. */
export function talentRadarModalPanelClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.draftModalPanel} max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface)] p-6 shadow-2xl`;
}

export function talentRadarFitBadgeClass(band: TalentRadarFitBand): string {
  const base = `${TALENT_RADAR_VISUAL_MARKERS.fitBadge} inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums`;
  switch (band) {
    case "strong":
      return `${base} border-emerald-400/50 bg-emerald-400/15 text-[var(--foreground)]`;
    case "good":
      return `${base} border-cyan-400/50 bg-cyan-400/15 text-[var(--foreground)]`;
    case "possible":
      return `${base} border-amber-400/45 bg-amber-400/12 text-[var(--foreground)]`;
    default:
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 text-[var(--twin-muted-strong)]`;
  }
}

export function talentRadarSummaryStatClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.summaryStat} rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface-2)]/60 px-4 py-3`;
}

export function talentRadarFilterToolbarClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.filterToolbar} rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/95 p-4 sm:p-5`;
}

export function talentRadarPrimaryCtaClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.primaryCta} twin-btn-solid text-sm font-semibold`;
}

export function talentRadarSecondaryCtaClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.secondaryCta} twin-btn-ghost text-sm font-medium`;
}

export function talentRadarTertiaryCtaClass(): string {
  return `${TALENT_RADAR_VISUAL_MARKERS.tertiaryCta} text-sm font-medium text-[var(--twin-muted-strong)] underline-offset-2 hover:underline`;
}

export function talentRadarSignalChipClass(kind: "positive" | "timing" | "risk" | "neutral"): string {
  const base = "inline-flex max-w-full items-center rounded-lg border px-2.5 py-1 text-xs font-medium leading-snug";
  switch (kind) {
    case "positive":
      return `${base} border-emerald-400/40 bg-emerald-400/10 text-[var(--foreground)]`;
    case "timing":
      return `${base} border-cyan-400/40 bg-cyan-400/10 text-[var(--foreground)]`;
    case "risk":
      return `${base} border-amber-400/45 bg-amber-400/12 text-[var(--foreground)]`;
    default:
      return `${base} border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 text-[var(--foreground)]`;
  }
}
