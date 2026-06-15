import type { TranslationKey } from "@/lib/i18n";

export const RECRUITER_AUDIT_ACTION_TYPES = [
  "decision_accept",
  "decision_decline",
  "review_opened",
  "radar_shortlisted",
  "radar_snoozed",
  "radar_dismissed",
  "radar_draft_prepared",
  "radar_review_card_opened",
] as const;

export const RECRUITER_AUDIT_FORBIDDEN_META_KEYS = [
  "decline_note",
  "note",
  "message",
  "body",
  "candidate_name",
  "email",
  "phone",
  "cv",
  "feedback",
] as const;

export const RECRUITER_AUDIT_ALLOWED_META_KEYS = [
  "status_before",
  "status_after",
  "source",
  "snooze_days",
  "dismiss_reason_code",
] as const;

export type RecruiterAuditEventRow = {
  id: number;
  application_id: number;
  company_slug: string;
  action_type: string;
  meta: Record<string, string>;
  created_at: string | null;
};

export function sanitizeRecruiterAuditMeta(
  meta: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!meta) return {};
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta)) {
    if ((RECRUITER_AUDIT_FORBIDDEN_META_KEYS as readonly string[]).includes(key)) continue;
    if (!(RECRUITER_AUDIT_ALLOWED_META_KEYS as readonly string[]).includes(key)) continue;
    if (value == null) continue;
    const text = String(value).trim();
    if (text) clean[key] = text.slice(0, 256);
  }
  return clean;
}

export function recruiterAuditActionLabelKey(actionType: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    decision_accept: "recruiterAudit.actionDecisionAccept",
    decision_decline: "recruiterAudit.actionDecisionDecline",
    review_opened: "recruiterAudit.actionReviewOpened",
    radar_shortlisted: "recruiterAudit.actionRadarShortlisted",
    radar_snoozed: "recruiterAudit.actionRadarSnoozed",
    radar_dismissed: "recruiterAudit.actionRadarDismissed",
    radar_draft_prepared: "recruiterAudit.actionRadarDraftPrepared",
    radar_review_card_opened: "recruiterAudit.actionRadarReviewOpened",
  };
  return map[actionType] ?? "recruiterAudit.actionUnknown";
}

export function formatRecruiterAuditTimestamp(iso: string | null, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function recruiterAuditTrailQuery(token: string, companySlug: string): string {
  return new URLSearchParams({ token, company_slug: companySlug }).toString();
}
