/** Talent Radar decisions — persist shortlist, snooze, dismiss; audit-only draft/review. */

export const TALENT_RADAR_DECISION_ACTIONS = [
  "shortlisted",
  "snoozed",
  "dismissed",
  "draft_prepared",
  "review_card_opened",
] as const;

export const TALENT_RADAR_SNOOZE_DAYS = [7, 30, 90] as const;

export const TALENT_RADAR_DISMISS_REASON_CODES = [
  "wrong_role",
  "low_fit",
  "timing",
  "already_contacted",
  "other",
] as const;

export const TALENT_RADAR_DECISION_FILTERS = [
  "active",
  "shortlisted",
  "snoozed",
  "dismissed",
] as const;

export type TalentRadarDecisionAction = (typeof TALENT_RADAR_DECISION_ACTIONS)[number];
export type TalentRadarSnoozeDays = (typeof TALENT_RADAR_SNOOZE_DAYS)[number];
export type TalentRadarDismissReasonCode = (typeof TALENT_RADAR_DISMISS_REASON_CODES)[number];
export type TalentRadarDecisionFilter = (typeof TALENT_RADAR_DECISION_FILTERS)[number];

export type TalentRadarLatestDecision = {
  id: number;
  application_id: number;
  company_slug: string;
  action_type: TalentRadarDecisionAction;
  meta: Record<string, string>;
  snooze_until: string | null;
  created_at: string | null;
  decision_state: TalentRadarDecisionFilter | "active";
};

export type TalentRadarDecisionPayload = {
  company_slug?: string;
  decision_filter?: string;
  items?: TalentRadarLatestDecision[];
};

export const TALENT_RADAR_DECISION_MARKERS = {
  decisionBadge: "recruiter-talent-radar-decision-badge",
  decisionFilter: "recruiter-talent-radar-decision-filter",
  snoozeModal: "recruiter-talent-radar-snooze-modal",
  dismissModal: "recruiter-talent-radar-dismiss-modal",
  draftModal: "recruiter-talent-radar-draft-modal",
  draftCopyButton: "recruiter-talent-radar-draft-copy",
  draftAuditWarning: "recruiter-talent-radar-draft-audit-warning",
  decisionToast: "recruiter-talent-radar-decision-toast",
} as const;

export function talentRadarDecisionsQuery(
  token: string,
  companySlug: string,
  opts?: { applicationId?: number; decisionFilter?: TalentRadarDecisionFilter },
): URLSearchParams {
  const params = new URLSearchParams({
    company_slug: companySlug.trim(),
    token: token.trim(),
  });
  if (opts?.applicationId) params.set("application_id", String(opts.applicationId));
  if (opts?.decisionFilter) params.set("decision_filter", opts.decisionFilter);
  return params;
}

export type PostTalentRadarDecisionBody = {
  application_id: number;
  action_type: TalentRadarDecisionAction;
  snooze_days?: TalentRadarSnoozeDays;
  dismiss_reason_code?: TalentRadarDismissReasonCode;
  meta?: Record<string, string>;
};

export function effectiveDecisionState(
  decision: TalentRadarLatestDecision | null | undefined,
): TalentRadarDecisionFilter | "active" {
  return decision?.decision_state ?? "active";
}

export function isSnoozeActive(decision: TalentRadarLatestDecision | null | undefined): boolean {
  return effectiveDecisionState(decision) === "snoozed";
}

export function matchesDecisionFilter(
  decision: TalentRadarLatestDecision | null | undefined,
  filter: TalentRadarDecisionFilter,
): boolean {
  const state = effectiveDecisionState(decision);
  if (filter === "active") return state === "active";
  return state === filter;
}

export function showsDraftPreparedBadge(
  decision: TalentRadarLatestDecision | null | undefined,
): boolean {
  if (!decision || decision.action_type !== "draft_prepared") return false;
  return effectiveDecisionState(decision) === "active";
}

export function buildDraftPreparedDecisionBody(
  row: {
    id: string;
    application_id?: number;
    score: number;
    fit_label: string;
  },
  jobId: string,
): PostTalentRadarDecisionBody {
  const meta: Record<string, string> = {
    source: "talent_radar",
    candidate_id: String(row.id),
    radar_score_snapshot: String(row.score),
    radar_fit_label_snapshot: row.fit_label,
  };
  const jid = jobId.trim();
  if (jid) meta.job_id = jid;
  return {
    application_id: Number(row.application_id ?? row.id),
    action_type: "draft_prepared",
    meta,
  };
}
