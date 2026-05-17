/** Fields from GET /api/v1/auth/me used to decide if core GDPR consents are complete. */

export type AuthMeCoreConsents = {
  gdpr_consent_at: string | null;
  terms_of_service_accepted_at: string | null;
  job_data_processing_consent_at: string | null;
  ai_matching_consent_at: string | null;
};

export function hasCoreConsents(me: AuthMeCoreConsents | null | undefined): boolean {
  if (!me) return false;
  return (
    me.gdpr_consent_at != null &&
    me.terms_of_service_accepted_at != null &&
    me.job_data_processing_consent_at != null &&
    me.ai_matching_consent_at != null
  );
}
