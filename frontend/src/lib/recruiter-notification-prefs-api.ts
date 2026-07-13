import { RECRUITER_NOTIFICATION_PREFS_API_PATH } from "@/lib/seven-day-c3-recruiter";

export type RecruiterNotificationPrefs = {
  company_slug: string;
  in_app_inbox_digest: boolean;
  in_app_interview_reminder: boolean;
  in_app_trust_review_alert: boolean;
  in_app_pipeline_update: boolean;
  updated_at?: string | null;
  updated_by_ref?: string | null;
};

export function recruiterNotificationPrefsQuery(token: string, companySlug: string): string {
  const params = new URLSearchParams({ company_slug: companySlug, token });
  return `${RECRUITER_NOTIFICATION_PREFS_API_PATH}?${params.toString()}`;
}

export function recruiterNotificationPrefsResetQuery(token: string, companySlug: string): string {
  const params = new URLSearchParams({ company_slug: companySlug, token });
  return `${RECRUITER_NOTIFICATION_PREFS_API_PATH}/reset?${params.toString()}`;
}
