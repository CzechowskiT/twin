/** Recruiter talent pool C2 API helpers — list, add, detail, archive. */

import type { TalentPoolPayload, TalentPoolRecord } from "@/lib/recruiter-talent-pool";
import { recruiterInboxQuery } from "@/lib/recruiter-inbox";

export type TalentPoolAddInput = {
  display_name: string;
  job_title?: string;
  location?: string;
  seniority?: string;
  skills?: string[];
  external_ats_id?: string;
  candidate_id?: string;
  pipeline_status?: string;
  idempotency_key?: string;
};

export type TalentPoolAddResult = {
  record: TalentPoolRecord;
  duplicate: boolean;
};

export async function fetchRecruiterTalentPool(
  token: string,
  companySlug: string,
  opts?: { search?: string; includeArchived?: boolean },
): Promise<TalentPoolPayload | null> {
  const params = new URLSearchParams(recruiterInboxQuery(token, companySlug));
  if (opts?.search) params.set("search", opts.search);
  if (opts?.includeArchived) params.set("include_archived", "true");
  const res = await fetch(`/api/recruiter/talent-pool?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as TalentPoolPayload;
}

export async function addRecruiterTalentPoolCandidate(
  token: string,
  companySlug: string,
  body: TalentPoolAddInput,
): Promise<TalentPoolAddResult | null> {
  const q = recruiterInboxQuery(token, companySlug);
  const res = await fetch(`/api/recruiter/talent-pool/candidates?${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return (await res.json()) as TalentPoolAddResult;
}

export async function fetchRecruiterTalentPoolDetail(
  token: string,
  companySlug: string,
  recordId: number,
): Promise<TalentPoolRecord | null> {
  const q = recruiterInboxQuery(token, companySlug);
  const res = await fetch(`/api/recruiter/talent-pool/${recordId}?${q}`);
  if (!res.ok) return null;
  return (await res.json()) as TalentPoolRecord;
}

export async function archiveRecruiterTalentPoolRecord(
  token: string,
  companySlug: string,
  recordId: number,
): Promise<TalentPoolRecord | null> {
  const q = recruiterInboxQuery(token, companySlug);
  const res = await fetch(`/api/recruiter/talent-pool/${recordId}?${q}`, { method: "PATCH" });
  if (!res.ok) return null;
  return (await res.json()) as TalentPoolRecord;
}
