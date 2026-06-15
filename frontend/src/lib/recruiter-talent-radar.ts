/** Recruiter Talent Radar / Sourcing Memory Agent — types, filters, PII guards. */

export const RECRUITER_TALENT_RADAR_ROUTE = "/recruiter/talent-radar";

export const RECRUITER_TALENT_RADAR_MARKERS = {
  page: "recruiter-talent-radar-page",
  hero: "recruiter-talent-radar-hero",
  statusChips: "recruiter-talent-radar-status-chips",
  filtersPanel: "recruiter-talent-radar-filters",
  summaryPanel: "recruiter-talent-radar-summary-panel",
  candidateCard: "recruiter-talent-radar-candidate-card",
  candidateGroup: "recruiter-talent-radar-candidate-group",
  disclaimer: "recruiter-talent-radar-disclaimer",
  emptyState: "recruiter-talent-radar-empty",
  draftPanel: "recruiter-talent-radar-draft-panel",
} as const;

export const RECRUITER_TALENT_RADAR_FORBIDDEN_PII = [
  "email",
  "phone",
  "cv_text",
  "cv_raw",
  "phone_number",
  "@",
] as const;

export const TALENT_RADAR_SEGMENTS = [
  "all_known",
  "previously_shortlisted",
  "previously_invited",
  "rejected_strong_signal",
  "inactive_stale",
  "high_evidence_quality",
  "possible_gaps",
] as const;

export const TALENT_RADAR_TIMING = [
  "all",
  "no_contact_30",
  "no_contact_90",
  "no_contact_180",
  "never_reviewed_role",
] as const;

export const TALENT_RADAR_SIGNALS = [
  "all",
  "skill_match",
  "previous_shortlist",
  "similar_role_history",
  "scorecard_signal",
  "evidence_completeness",
  "location_fit",
  "seniority_fit",
  "needs_verification",
] as const;

export type TalentRadarFitLabel = "strong" | "good" | "possible" | "weak";
export type TalentRadarStatus =
  | "ready_to_review"
  | "needs_verification"
  | "consent_check_required"
  | "stale_data"
  | "not_enough_evidence";
export type TalentRadarNextAction =
  | "open_review_card"
  | "prepare_outreach_draft"
  | "add_to_shortlist"
  | "verify_data"
  | "snooze";
export type TalentRadarDataConfidence = "high" | "medium" | "low";

export type TalentRadarCandidate = {
  id: string;
  application_id?: number;
  display_name: string;
  headline?: string | null;
  fit_label: TalentRadarFitLabel;
  score: number;
  status: TalentRadarStatus;
  why_surfaced: string[];
  why_now: string[];
  evidence: string[];
  risks: string[];
  missing_data: string[];
  last_interaction?: string | null;
  recommended_next_action: TalentRadarNextAction;
  data_confidence: TalentRadarDataConfidence;
  human_decision_required: true;
  job_title?: string;
};

export type TalentRadarFilters = {
  roleId: string;
  segment: (typeof TALENT_RADAR_SEGMENTS)[number];
  timingWindow: (typeof TALENT_RADAR_TIMING)[number];
  signalType: (typeof TALENT_RADAR_SIGNALS)[number];
};

export const DEFAULT_TALENT_RADAR_FILTERS: TalentRadarFilters = {
  roleId: "",
  segment: "all_known",
  timingWindow: "all",
  signalType: "all",
};

export type TalentRadarPayload = {
  company_slug?: string;
  suggestions?: TalentRadarCandidate[];
  summary?: {
    total: number;
    scope: string;
    external_sourcing_connected: boolean;
    pilot: boolean;
  };
  filters?: {
    roles?: { id: number; title: string }[];
  };
  data_quality_warnings?: string[];
  generated_at?: string;
  disclaimer?: string;
};

export function talentRadarQueryParams(
  token: string,
  companySlug: string,
  filters: TalentRadarFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    company_slug: companySlug.trim(),
    token: token.trim(),
  });
  if (filters.roleId.trim()) params.set("role_id", filters.roleId.trim());
  if (filters.segment !== "all_known") params.set("segment", filters.segment);
  if (filters.timingWindow !== "all") params.set("timing_window", filters.timingWindow);
  if (filters.signalType !== "all") params.set("signal_type", filters.signalType);
  return params;
}

export function talentRadarRowHasForbiddenPii(row: Record<string, unknown>): boolean {
  const blob = JSON.stringify(row).toLowerCase();
  return RECRUITER_TALENT_RADAR_FORBIDDEN_PII.some((marker) => blob.includes(marker.toLowerCase()));
}

export function talentRadarInboxHighlightHref(applicationId: number): string {
  return `/recruiter/inbox?highlight=${applicationId}`;
}

export function isTalentRadarWorkspaceScoped(payload: TalentRadarPayload): boolean {
  return payload.summary?.scope === "internal_workspace" && payload.summary?.external_sourcing_connected === false;
}

export function buildOutreachDraftText(
  candidate: TalentRadarCandidate,
  roleTitle: string,
  locale: string,
): string {
  const pl = locale.toLowerCase().startsWith("pl");
  const why = candidate.why_surfaced.slice(0, 2).join("; ");
  if (pl) {
    return [
      `Szkic wiadomości (NIE WYSŁANO) — ${candidate.display_name}`,
      "",
      `Kontekst roli: ${roleTitle || "Twoja otwarta rola"}`,
      `Dlaczego kontakt: ${why}`,
      "",
      "Cześć [imię],",
      "",
      "Piszę w kontekście roli, którą prowadzę. Na podstawie wcześniejszego kontekstu w TWIN wygląda na to, że możesz pasować — chętnie porozmawiam, jeśli jesteś otwarty/a.",
      "",
      "[Miejsce na personalizację]",
      "",
      "Jeśli teraz nie jest dobry moment — daj znać, bez problemu.",
      "",
      "— [Twoje imię]",
    ].join("\n");
  }
  return [
    `Message draft (NOT SENT) — ${candidate.display_name}`,
    "",
    `Role context: ${roleTitle || "Your open role"}`,
    `Why reaching out: ${why}`,
    "",
    "Hi [name],",
    "",
    "I'm reaching out about a role I'm hiring for. Based on prior context in TWIN, you may be a fit — happy to chat if you're open.",
    "",
    "[Personalization placeholder]",
    "",
    "If the timing isn't right, no worries — just let me know.",
    "",
    "— [Your name]",
  ].join("\n");
}
