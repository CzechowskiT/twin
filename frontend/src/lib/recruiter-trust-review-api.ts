/** Recruiter trust review queue C2 API — list, detail, decisions. */

import { recruiterCompanyQuery, recruiterJwtAuthHeaders } from "@/lib/recruiter-jwt";

export type TrustReviewQueueItemLive = {
  id: number;
  item_kind: string;
  subject_ref: string;
  candidate_ref?: string | null;
  reason_key: string;
  reason_summary: string;
  status: string;
  priority?: string | null;
  consent_state: string;
  privacy_request_id?: number | null;
  decision_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TrustReviewQueuePayload = {
  company_slug: string;
  summary: { total: number; pending_review: number; shown: number };
  items: TrustReviewQueueItemLive[];
  pilot_status: string;
  browser_smoke_status: string;
};

export type TrustReviewDecision = {
  id: number;
  item_id: number;
  decision: string;
  note?: string | null;
  actor_ref: string;
  created_at?: string | null;
};

export async function fetchRecruiterTrustReviewQueue(
  jwt: string,
  companySlug: string,
): Promise<TrustReviewQueuePayload | null> {
  const q = recruiterCompanyQuery(companySlug);
  const res = await fetch(`/api/recruiter/trust-review-queue?${q}`, {
    headers: recruiterJwtAuthHeaders(jwt),
  });
  if (!res.ok) return null;
  return (await res.json()) as TrustReviewQueuePayload;
}

export async function postRecruiterTrustReviewDecision(
  jwt: string,
  companySlug: string,
  itemId: number,
  body: { decision: string; note?: string },
): Promise<{ decision: TrustReviewDecision; status: string } | null> {
  const q = recruiterCompanyQuery(companySlug);
  const res = await fetch(`/api/recruiter/trust-review-queue/${itemId}/decisions?${q}`, {
    method: "POST",
    headers: recruiterJwtAuthHeaders(jwt, { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return (await res.json()) as { decision: TrustReviewDecision; status: string };
}

export async function fetchRecruiterTrustReviewDecisions(
  jwt: string,
  companySlug: string,
  itemId: number,
): Promise<TrustReviewDecision[]> {
  const q = recruiterCompanyQuery(companySlug);
  const res = await fetch(`/api/recruiter/trust-review-queue/${itemId}/decisions?${q}`, {
    headers: recruiterJwtAuthHeaders(jwt),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { decisions: TrustReviewDecision[] };
  return data.decisions ?? [];
}
