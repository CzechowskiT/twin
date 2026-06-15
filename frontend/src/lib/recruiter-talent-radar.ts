import type { TalentRadarLatestDecision } from "@/lib/recruiter-talent-radar-decisions";

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
  "imported_internal_pool",
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
  "imported_internal_pool",
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
  source?: string;
  source_signals?: string[];
  latest_decision?: TalentRadarLatestDecision | null;
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
  const role = roleTitle || candidate.job_title || (pl ? "Twoja otwarta rola" : "Your open role");
  const signals = candidate.why_surfaced.slice(0, 2).join(pl ? "; " : "; ");
  if (pl) {
    return [
      `Cześć [imię],`,
      "",
      `Piszę w kontekście roli ${role}. Na podstawie wcześniejszego kontekstu w TWIN widzę, że możesz pasować do tej rozmowy, szczególnie ze względu na: ${signals || "wcześniejszy kontekst w workspace"}.`,
      "",
      "Nie zakładam, że to właściwy moment — chciałem tylko sprawdzić, czy temat może być dla Ciebie interesujący.",
      "",
      "[Tu dodaj własną personalizację przed wysłaniem.]",
      "",
      "Jeśli nie chcesz otrzymywać takich wiadomości, daj znać — uszanuję to.",
      "",
      "[Twoje imię]",
    ].join("\n");
  }
  return [
    "Hi [name],",
    "",
    `I'm reaching out about the role ${role}. Based on prior context in TWIN, you may be a fit for this conversation, especially given: ${signals || "prior workspace context"}.`,
    "",
    "I'm not assuming the timing is right — I wanted to check whether the topic might interest you.",
    "",
    "[Add your own personalization before sending.]",
    "",
    "If you prefer not to receive messages like this, let me know — I will respect that.",
    "",
    "[Your name]",
  ].join("\n");
}
