import type { TranslationKey } from "@/lib/i18n";

/** Legacy pipeline status (user/recruiter workflow). */
const PIPELINE_STATUS_KEYS: Record<string, TranslationKey> = {
  pending: "dashboard.appStatusPending",
  applied: "dashboard.appStatusInPipeline",
  interview: "dashboard.appStatusInterview",
  rejected: "dashboard.appStatusRejected",
  hired: "dashboard.appStatusHired",
  saved: "dashboard.appStatusBookmark",
};

/** Honest external submission phases (preferred for display). */
const SUBMISSION_STATUS_KEYS: Record<string, TranslationKey> = {
  application_created_in_twin: "dashboard.submissionCreatedInTwin",
  application_prepared: "dashboard.submissionPrepared",
  external_submit_attempted: "dashboard.submissionAttempted",
  external_submit_confirmed: "dashboard.submissionConfirmed",
  external_submit_failed: "dashboard.submissionFailed",
  manual_action_required: "dashboard.submissionManualRequired",
  interview_scheduled: "dashboard.appStatusInterview",
  rejected: "dashboard.appStatusRejected",
  hired: "dashboard.appStatusHired",
};

export function applicationStatusKey(status: string): TranslationKey {
  const s = status.trim().toLowerCase();
  return SUBMISSION_STATUS_KEYS[s] ?? PIPELINE_STATUS_KEYS[s] ?? "dashboard.appStatusPending";
}

/** Prefer API display_status / submission_status over legacy status for badges. */
export function applicationDisplayStatusKey(
  legacyStatus: string,
  opts?: { submission_status?: string | null; display_status?: string | null },
): TranslationKey {
  const display = opts?.display_status?.trim().toLowerCase();
  if (display) return applicationStatusKey(display);
  const sub = opts?.submission_status?.trim().toLowerCase();
  if (sub) return applicationStatusKey(sub);
  return applicationStatusKey(legacyStatus);
}

export function isExternallySubmitConfirmed(opts?: {
  submission_status?: string | null;
}): boolean {
  return opts?.submission_status === "external_submit_confirmed";
}
