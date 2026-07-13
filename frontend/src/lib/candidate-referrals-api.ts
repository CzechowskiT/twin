/** Types and helpers for candidate referral program persistence API. */

import type { TranslationKey } from "@/lib/i18n";

export type CandidateReferralStatus = "pending" | "signed_up" | "qualified" | "void";

export type CandidateReferralItem = {
  id: number;
  status: CandidateReferralStatus;
  invite_email: string | null;
  referred_user_id: number | null;
  ref_code_used: string | null;
  created_at: string;
  signed_up_at: string | null;
};

export type CandidateReferralProgram = {
  candidate_id: number;
  referral_code: string;
  share_path: string;
  total_referrals: number;
  pending_invites: number;
  signed_up_count: number;
  qualified_count: number;
  created_at: string;
  updated_at: string;
};

export type CandidateReferralsData = {
  program: CandidateReferralProgram;
  referrals: CandidateReferralItem[];
  manual_processing_notice: string;
  pilot_labelled: boolean;
};

export const CANDIDATE_REFERRALS_API_PATH = "/api/v1/candidates/me/referrals";
export const CANDIDATE_REFERRALS_ENSURE_CODE_PATH = "/api/v1/candidates/me/referrals/ensure-code";
export const CANDIDATE_REFERRALS_INVITE_PATH = "/api/v1/candidates/me/referrals/invite";
export const CANDIDATE_REFERRALS_RESOLVE_PATH = "/api/v1/candidates/referrals/resolve";

export function candidateReferralPath(id: number): string {
  return `${CANDIDATE_REFERRALS_API_PATH}/${id}`;
}

export function buildReferralShareUrl(origin: string, sharePath: string): string {
  return `${origin.replace(/\/$/, "")}${sharePath.startsWith("/") ? sharePath : `/${sharePath}`}`;
}

export function referralStatusLabelKey(status: CandidateReferralStatus): TranslationKey {
  const map: Record<CandidateReferralStatus, TranslationKey> = {
    pending: "referrals.statusPending",
    signed_up: "referrals.statusSignedUp",
    qualified: "referrals.statusQualified",
    void: "referrals.statusVoid",
  };
  return map[status] ?? "referrals.statusPending";
}
