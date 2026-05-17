/** Fields from GET /api/v1/auth/me used to decide if core GDPR consents are complete. */

export type AuthMeCoreConsents = {
  gdpr_consent_at: string | null;
  terms_of_service_accepted_at: string | null;
  job_data_processing_consent_at: string | null;
  ai_matching_consent_at: string | null;
};

function consentFieldPresent(v: string | null | undefined): boolean {
  if (v == null) return false;
  return String(v).trim().length > 0;
}

export function hasCoreConsents(me: AuthMeCoreConsents | null | undefined): boolean {
  if (!me) return false;
  return (
    consentFieldPresent(me.gdpr_consent_at) &&
    consentFieldPresent(me.terms_of_service_accepted_at) &&
    consentFieldPresent(me.job_data_processing_consent_at) &&
    consentFieldPresent(me.ai_matching_consent_at)
  );
}
