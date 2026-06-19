/** Candidate visibility preferences — internal TWIN state only. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";

export { LAUNCH_STANCE };

export const CANDIDATE_VISIBILITY_PREFERENCES_ROUTE = "/dashboard/trust/visibility-preferences";
export const CANDIDATE_VISIBILITY_PREFERENCES_PROFILE_ALIAS = "/profile/trust/visibility-preferences";
export const CANDIDATE_VISIBILITY_PREFERENCES_API_PATH = "/api/v1/candidate-visibility-preferences";

export const CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER = "candidate-visibility-preferences-page";

export const CANDIDATE_VISIBILITY_PREFERENCES_MARKERS = {
  page: CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER,
  header: "candidate-visibility-preferences-header",
  fields: "candidate-visibility-preferences-fields",
  persistenceNote: "candidate-visibility-preferences-persistence-note",
  boundary: "candidate-visibility-preferences-boundary",
  pilotBadge: "candidate-visibility-preferences-pilot-badge",
  controlCenterLink: "candidate-visibility-preferences-control-center-link",
} as const;

export const CANDIDATE_VISIBILITY_PREFERENCES_FORBIDDEN_PATTERNS: RegExp[] = [
  /public visibility enabled/i,
  /recruiter notified/i,
  /company notified/i,
  /email sent/i,
  /ATS sync/i,
  /saved successfully/i,
  /submitted successfully/i,
  /GDPR compliant/i,
];

export type VisibilityPreferenceField = {
  id: string;
  labelKey: TranslationKey;
  value: string;
};

export const CANDIDATE_VISIBILITY_PREFERENCE_DEMO_FIELDS: VisibilityPreferenceField[] = [
  { id: "profile_visibility", labelKey: "candidateVisibilityPreferences.fieldProfile", value: "private" },
  { id: "cv_visibility", labelKey: "candidateVisibilityPreferences.fieldCv", value: "private" },
  { id: "match_visibility", labelKey: "candidateVisibilityPreferences.fieldMatch", value: "pilot_visible" },
  { id: "company_visibility", labelKey: "candidateVisibilityPreferences.fieldCompany", value: "hidden" },
  {
    id: "communication_preference",
    labelKey: "candidateVisibilityPreferences.fieldCommunication",
    value: "no_outreach",
  },
];

export function candidateVisibilityPreferencesHref(): string {
  return CANDIDATE_VISIBILITY_PREFERENCES_ROUTE;
}
