/** Wave 1 — live trust API paths + bundle types (no demo fixtures as production truth). */

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type {
  ConsentItem,
  ConsentReceipt,
  PrivacyRequest,
  TrustAuditEvent,
  TrustCenterData,
} from "@/lib/candidate-trust-api";
import {
  CONSENTS_API_PATH,
  CONSENT_RECEIPTS_API_PATH,
  PRIVACY_REQUESTS_API_PATH,
  TRUST_AUDIT_EVENTS_API_PATH,
  TRUST_CENTER_API_PATH,
} from "@/lib/candidate-trust-api";

export const TRUST_LIVE_BUNDLE_API_PATH = "/api/v1/candidates/me/trust/live-bundle";
export const TRUST_ACTIVITY_TIMELINE_API_PATH = "/api/v1/candidates/me/trust/activity-timeline";
export const WAVE1_STATUS_API_PATH = "/api/v1/platform/wave1/status";
export const WAVE1_HARD_LIVE_EVIDENCE_API_PATH = "/api/v1/platform/wave1/hard-live/evidence";
export const MY_DATA_EXPORT_JSON_PATH = "/api/v1/candidates/me/export.json";
export const NOTIFICATION_PREFS_API_PATH = "/api/v1/auth/me/notification-preferences";
export const KYC_STATUS_API_PATH = "/api/v1/kyc/status";
export const KYC_CONFIGURED_API_PATH = "/api/v1/kyc/authologic/configured";

export type TrustLiveBundle = {
  candidate_id: number;
  display_name: string;
  source: "live";
  demo_fixture: false;
  live_claim: false;
  pilot_stance: string;
  trust: TrustCenterData;
  consents: { items: ConsentItem[]; total?: number; manual_processing_notice?: string };
  consent_receipts: { items: ConsentReceipt[]; total: number };
  privacy_requests: { items: PrivacyRequest[]; total: number };
  audit_events: { items: TrustAuditEvent[]; total: number };
  communication_preferences: {
    email_product_updates: boolean;
    email_interview_reminders: boolean;
    outbound_to_humans_in_smoke: false;
  };
  identity: {
    identity_verified_at: string | null;
    fake_kyc_forbidden: true;
    workflow: string;
    provider_module?: string;
    provider_held?: boolean;
    manual_review_request_type?: string;
  };
  export_lifecycle?: {
    self_serve_path: string;
    intake_request_type: string;
    ops_fulfillment_auto: false;
    deletion_held: boolean;
    preview_demo_forbidden_as_live: boolean;
  };
  calendar: {
    google_path_approved: true;
    microsoft_write_blocked: true;
    microsoft_busy_read_default: boolean;
  };
  auto_apply_paused: true;
  manual_processing_notice?: string;
  generated_at: string;
};

export async function fetchTrustLiveBundle(token?: string | null): Promise<TrustLiveBundle> {
  const auth = token ?? getToken();
  if (!auth) throw new Error("auth_required");
  return apiFetch<TrustLiveBundle>(TRUST_LIVE_BUNDLE_API_PATH, {}, auth);
}

export async function fetchTrustCenterLive(token?: string | null): Promise<TrustCenterData> {
  const auth = token ?? getToken();
  if (!auth) throw new Error("auth_required");
  return apiFetch<TrustCenterData>(TRUST_CENTER_API_PATH, {}, auth);
}

export async function createPrivacyRequestLive(
  requestType: PrivacyRequest["request_type"],
  payload: Record<string, unknown>,
  idempotencyKey: string,
  token?: string | null,
): Promise<PrivacyRequest> {
  const auth = token ?? getToken();
  if (!auth) throw new Error("auth_required");
  return apiFetch<PrivacyRequest>(
    PRIVACY_REQUESTS_API_PATH,
    {
      method: "POST",
      body: JSON.stringify({
        request_type: requestType,
        payload,
        idempotency_key: idempotencyKey,
      }),
    },
    auth,
  );
}

export async function grantConsentLive(
  purpose: ConsentItem["purpose"],
  idempotencyKey: string,
  token?: string | null,
): Promise<{ items: ConsentItem[] }> {
  const auth = token ?? getToken();
  if (!auth) throw new Error("auth_required");
  return apiFetch(
    CONSENTS_API_PATH,
    {
      method: "POST",
      body: JSON.stringify({ purpose, idempotency_key: idempotencyKey }),
    },
    auth,
  );
}

export async function patchNotificationPrefsLive(
  prefs: { email_product_updates?: boolean; email_interview_reminders?: boolean },
  token?: string | null,
): Promise<unknown> {
  const auth = token ?? getToken();
  if (!auth) throw new Error("auth_required");
  return apiFetch(NOTIFICATION_PREFS_API_PATH, { method: "PATCH", body: JSON.stringify(prefs) }, auth);
}

export function isDemoFixtureCandidateId(id: string | undefined | null): boolean {
  if (!id) return false;
  return id.trim() === "demo-candidate-001";
}

export {
  CONSENTS_API_PATH,
  CONSENT_RECEIPTS_API_PATH,
  PRIVACY_REQUESTS_API_PATH,
  TRUST_AUDIT_EVENTS_API_PATH,
  TRUST_CENTER_API_PATH,
};
