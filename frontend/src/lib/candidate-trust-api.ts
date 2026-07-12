/** Types and helpers for candidate trust center persistence API. */

export type ConsentPurpose =
  | "cv_processing"
  | "intro_audio_processing"
  | "talent_pool"
  | "profile_documents";

export type ConsentStatus = "active" | "withdrawn" | "not_granted" | "review_required";

export type PrivacyRequestType = "correction" | "export" | "portability" | "withdrawal" | "deletion";

export type PrivacyRequestStatus = "open" | "processing" | "completed" | "cancelled";

export type ConsentItem = {
  purpose: ConsentPurpose;
  status: ConsentStatus;
  granted_at: string | null;
  withdrawn_at: string | null;
  note: string;
};

export type ConsentReceipt = {
  id: number;
  consent_purpose: string;
  action: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PrivacyRequest = {
  id: number;
  request_type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  manual_processing_notice: string;
};

export type TrustAuditEvent = {
  id: number;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  actor: string;
  created_at: string;
};

export type TrustDataSource = {
  id: string;
  kind: string;
  label: string;
  detail: string;
  last_synced_at: string | null;
};

export type TrustTimelineEvent = {
  id: string;
  type: string;
  at: string;
  summary: string;
};

export type TrustCenterData = {
  candidate_id: number;
  display_name: string;
  configured: boolean;
  twin_knows_summary: string;
  twin_knows_items: string[];
  data_sources: TrustDataSource[];
  consent_items: ConsentItem[];
  privacy_request_counts: Record<string, number>;
  audit_event_count: number;
  trust_timeline: TrustTimelineEvent[];
  manual_processing_notice: string;
  pilot_labelled: boolean;
  updated_at: string | null;
};

export const TRUST_CENTER_API_PATH = "/api/v1/candidates/me/trust";
export const CONSENTS_API_PATH = "/api/v1/candidates/me/consents";
export const CONSENT_RECEIPTS_API_PATH = "/api/v1/candidates/me/consent-receipts";
export const PRIVACY_REQUESTS_API_PATH = "/api/v1/candidates/me/privacy-requests";
export const TRUST_AUDIT_EVENTS_API_PATH = "/api/v1/candidates/me/trust/audit-events";

export function privacyRequestPath(id: number): string {
  return `${PRIVACY_REQUESTS_API_PATH}/${id}`;
}

export function privacyRequestCancelPath(id: number): string {
  return `${PRIVACY_REQUESTS_API_PATH}/${id}/cancel`;
}
