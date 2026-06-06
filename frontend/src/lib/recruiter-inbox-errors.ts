/** Stable recruiter inbox API error codes — never expose env var names to users. */

export const RECRUITER_INBOX_ERROR = {
  unavailable: "recruiter_inbox_unavailable",
  invalidToken: "recruiter_inbox_invalid_token",
  companyRequired: "recruiter_inbox_company_required",
} as const;

export type RecruiterInboxErrorCode =
  (typeof RECRUITER_INBOX_ERROR)[keyof typeof RECRUITER_INBOX_ERROR];

export type RecruiterInboxErrorMessageKey =
  | "errorUnavailable"
  | "errorInvalidToken"
  | "errorNetwork"
  | "loadFailed";

export function parseRecruiterInboxErrorDetail(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return trimmed;
  }
  return trimmed;
}

/** Map HTTP status + API detail to a recruiterInbox i18n key (never raw JSON/env names). */
export function recruiterInboxErrorMessageKey(
  detail: string | null,
  status: number,
  isNetworkFailure = false,
): RecruiterInboxErrorMessageKey {
  if (isNetworkFailure) return "errorNetwork";
  const code = (detail ?? "").trim();
  if (code === RECRUITER_INBOX_ERROR.unavailable || status === 503) {
    return "errorUnavailable";
  }
  if (
    code === RECRUITER_INBOX_ERROR.invalidToken ||
    code === "Unauthorized" ||
    status === 401
  ) {
    return "errorInvalidToken";
  }
  return "loadFailed";
}
