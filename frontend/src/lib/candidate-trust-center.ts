/** Candidate Trust Center — candidate-facing transparency layer (pilot). */

import {
  CANDIDATE_TRUST_CENTER_DEMO_ID,
  getCandidateTrustCenterDemo,
  type CandidateTrustCenterRecord,
  type ConsentDataUseItem,
  type TrustTimelineEvent,
} from "@/lib/candidate-trust-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import type { TrustCenterData } from "@/lib/candidate-trust-api";

export { CANDIDATE_TRUST_CENTER_DEMO_ID };

export const CANDIDATE_TRUST_CENTER_PAGE_MARKER = "candidate-trust-center-page";

export const CANDIDATE_TRUST_CENTER_MARKERS = {
  page: CANDIDATE_TRUST_CENTER_PAGE_MARKER,
  header: "candidate-trust-center-header",
  whatTwinKnows: "candidate-trust-center-what-twin-knows",
  dataSources: "candidate-trust-center-data-sources",
  visibility: "candidate-trust-center-visibility",
  consentDataUse: "candidate-trust-center-consent-data-use",
  communicationPreferences: "candidate-trust-center-communication-preferences",
  humanDecisioning: "candidate-trust-center-human-decisioning",
  candidateControls: "candidate-trust-center-candidate-controls",
  trustTimeline: "candidate-trust-center-trust-timeline",
  boundary: "candidate-trust-center-boundary",
  notFound: "candidate-trust-center-not-found",
  pilotBadge: "candidate-trust-center-pilot-badge",
} as const;

export const CANDIDATE_TRUST_CENTER_ROUTE = "/dashboard/trust";
export const CANDIDATE_TRUST_CENTER_PROFILE_ALIAS = "/profile/trust";

export const CANDIDATE_TRUST_CENTER_SAFE_LINKS = {
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  applications: CANDIDATE_CANONICAL_ROUTES.applications,
  evidence: CANDIDATE_CANONICAL_ROUTES.evidence,
  identity: CANDIDATE_CANONICAL_ROUTES.identity,
  cv: CANDIDATE_CANONICAL_ROUTES.cv,
  plan: CANDIDATE_CANONICAL_ROUTES.plan,
} as const;

export function candidateTrustCenterHref(): string {
  return CANDIDATE_TRUST_CENTER_ROUTE;
}

export function resolveCandidateTrustCenter(candidateId?: string): CandidateTrustCenterRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_TRUST_CENTER_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_TRUST_CENTER_DEMO_ID) {
    return getCandidateTrustCenterDemo();
  }
  return null;
}

export function isCandidateTrustCenterDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_TRUST_CENTER_DEMO_ID;
}

/** Map persisted API payload to workspace record shape. */
export function trustCenterDataToRecord(data: TrustCenterData): CandidateTrustCenterRecord {
  const consentItems: ConsentDataUseItem[] = data.consent_items.map((item) => ({
    id: item.purpose,
    purpose: item.purpose.replace(/_/g, " "),
    status:
      item.status === "active"
        ? "active"
        : item.status === "review_required"
          ? "review_required"
          : "not_live",
    note: item.note,
  }));
  const trustTimeline: TrustTimelineEvent[] = data.trust_timeline.map((event) => ({
    id: event.id,
    type: mapAuditEventType(event.type),
    at: event.at,
    summary: event.summary,
    outbound_sent: false,
  }));
  return {
    id: String(data.candidate_id),
    display_name: data.display_name,
    headline: data.twin_knows_summary,
    role_id: "",
    role_title: "—",
    trust_label: "PILOT",
    last_reviewed_at: data.updated_at ?? new Date().toISOString(),
    twin_knows_summary: data.twin_knows_summary,
    twin_knows_items: data.twin_knows_items,
    data_sources: data.data_sources.map((source) => ({
      id: source.id,
      kind: source.kind as CandidateTrustCenterRecord["data_sources"][number]["kind"],
      label: source.label,
      detail: source.detail,
      last_synced_at: source.last_synced_at ?? new Date().toISOString(),
      sample_only: true,
    })),
    visibility_scopes: [],
    consent_items: consentItems,
    communication_preferences: [],
    human_decision_note: data.manual_processing_notice,
    controls_export_disabled: true,
    controls_delete_disabled: true,
    trust_timeline: trustTimeline,
    pilot_labelled: true as const,
  };
}

function mapAuditEventType(type: string): TrustTimelineEvent["type"] {
  if (type === "consent_granted" || type === "consent_withdrawn") return "consent_recorded";
  if (type === "privacy_request_created") return "export_requested";
  if (type === "profile_updated") return "profile_updated";
  return "consent_recorded";
}
