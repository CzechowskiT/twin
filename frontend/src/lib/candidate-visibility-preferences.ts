/** Candidate visibility preferences — internal TWIN state only. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  fetchSafePersistenceList,
  patchSafePersistence,
  postSafePersistence,
  type SafePersistenceSource,
  type SafePersistenceWriteResult,
} from "@/lib/safe-persistence-api";

export { LAUNCH_STANCE };
export type { SafePersistenceSource };

export const CANDIDATE_VISIBILITY_PREFERENCES_ROUTE = "/dashboard/trust/visibility-preferences";
export const CANDIDATE_VISIBILITY_PREFERENCES_PROFILE_ALIAS = "/profile/trust/visibility-preferences";
export const CANDIDATE_VISIBILITY_PREFERENCES_API_PATH = "/api/v1/candidate-visibility-preferences";

export const CANDIDATE_VISIBILITY_PREFERENCES_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER = "candidate-visibility-preferences-page";

export const CANDIDATE_VISIBILITY_PREFERENCES_MARKERS = {
  page: CANDIDATE_VISIBILITY_PREFERENCES_PAGE_MARKER,
  header: "candidate-visibility-preferences-header",
  fields: "candidate-visibility-preferences-fields",
  persistenceNote: "candidate-visibility-preferences-persistence-note",
  boundary: "candidate-visibility-preferences-boundary",
  pilotBadge: "candidate-visibility-preferences-pilot-badge",
  controlCenterLink: "candidate-visibility-preferences-control-center-link",
  dataSource: "candidate-visibility-preferences-data-source",
  saveForm: "candidate-visibility-preferences-save-form",
  writeStatus: "candidate-visibility-preferences-write-status",
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

export type VisibilityPreferenceFieldId =
  | "profile_visibility"
  | "cv_visibility"
  | "match_visibility"
  | "company_visibility"
  | "communication_preference";

export type VisibilityPreferenceField = {
  id: VisibilityPreferenceFieldId;
  labelKey: TranslationKey;
  value: string;
  options: readonly string[];
};

export const CANDIDATE_VISIBILITY_PREFERENCE_FIELDS: VisibilityPreferenceField[] = [
  {
    id: "profile_visibility",
    labelKey: "candidateVisibilityPreferences.fieldProfile",
    value: "private",
    options: ["private", "pilot_visible", "recruiter_visible_preview"],
  },
  {
    id: "cv_visibility",
    labelKey: "candidateVisibilityPreferences.fieldCv",
    value: "private",
    options: ["private", "pilot_visible"],
  },
  {
    id: "match_visibility",
    labelKey: "candidateVisibilityPreferences.fieldMatch",
    value: "pilot_visible",
    options: ["private", "pilot_visible", "recruiter_visible_preview"],
  },
  {
    id: "company_visibility",
    labelKey: "candidateVisibilityPreferences.fieldCompany",
    value: "hidden",
    options: ["hidden", "visible_preview"],
  },
  {
    id: "communication_preference",
    labelKey: "candidateVisibilityPreferences.fieldCommunication",
    value: "no_outreach",
    options: ["no_outreach", "draft_only", "manual_review_required"],
  },
];

export type VisibilityPreferenceRecord = {
  id?: number;
  candidate_id: string;
  profile_visibility: string;
  cv_visibility: string;
  match_visibility: string;
  company_visibility: string;
  communication_preference: string;
};

type ApiVisibilityItem = VisibilityPreferenceRecord & { id: number };

type ApiVisibilityResponse = { items: ApiVisibilityItem[] };

function demoRecord(): VisibilityPreferenceRecord {
  return {
    candidate_id: CANDIDATE_VISIBILITY_PREFERENCES_DEMO_CANDIDATE_ID,
    profile_visibility: CANDIDATE_VISIBILITY_PREFERENCE_FIELDS[0].value,
    cv_visibility: CANDIDATE_VISIBILITY_PREFERENCE_FIELDS[1].value,
    match_visibility: CANDIDATE_VISIBILITY_PREFERENCE_FIELDS[2].value,
    company_visibility: CANDIDATE_VISIBILITY_PREFERENCE_FIELDS[3].value,
    communication_preference: CANDIDATE_VISIBILITY_PREFERENCE_FIELDS[4].value,
  };
}

export function resolveCandidateVisibilityPreferences(): VisibilityPreferenceRecord {
  return demoRecord();
}

function mapApiItem(item: ApiVisibilityItem): VisibilityPreferenceRecord {
  return {
    id: item.id,
    candidate_id: item.candidate_id,
    profile_visibility: item.profile_visibility,
    cv_visibility: item.cv_visibility,
    match_visibility: item.match_visibility,
    company_visibility: item.company_visibility,
    communication_preference: item.communication_preference,
  };
}

export async function loadCandidateVisibilityPreferences(): Promise<{
  source: SafePersistenceSource;
  record: VisibilityPreferenceRecord;
}> {
  const demo = demoRecord();
  // Live path: list owned prefs without forcing demo-candidate-001 as sole truth.
  const result = await fetchSafePersistenceList<ApiVisibilityResponse>(
    CANDIDATE_VISIBILITY_PREFERENCES_API_PATH,
    { items: [] },
  );
  if (result.source === "live" && result.data.items.length > 0) {
    return { source: "live", record: mapApiItem(result.data.items[0]) };
  }
  if (result.source === "live") {
    return {
      source: "live",
      record: {
        ...demo,
        candidate_id: "authenticated",
      },
    };
  }
  return { source: result.source, record: demo };
}

export async function saveCandidateVisibilityPreferences(
  record: VisibilityPreferenceRecord,
): Promise<SafePersistenceWriteResult<ApiVisibilityItem>> {
  const candidateId =
    !record.candidate_id ||
    record.candidate_id === CANDIDATE_VISIBILITY_PREFERENCES_DEMO_CANDIDATE_ID ||
    record.candidate_id === "authenticated"
      ? `cand-user`
      : record.candidate_id;
  const body = {
    candidate_id: candidateId,
    profile_visibility: record.profile_visibility,
    cv_visibility: record.cv_visibility,
    match_visibility: record.match_visibility,
    company_visibility: record.company_visibility,
    communication_preference: record.communication_preference,
  };
  if (record.id != null) {
    return patchSafePersistence<ApiVisibilityItem>(
      `${CANDIDATE_VISIBILITY_PREFERENCES_API_PATH}/${record.id}`,
      body,
    );
  }
  return postSafePersistence<ApiVisibilityItem>(CANDIDATE_VISIBILITY_PREFERENCES_API_PATH, body);
}

export function candidateVisibilityPreferencesHref(): string {
  return CANDIDATE_VISIBILITY_PREFERENCES_ROUTE;
}

/** @deprecated use CANDIDATE_VISIBILITY_PREFERENCE_FIELDS */
export const CANDIDATE_VISIBILITY_PREFERENCE_DEMO_FIELDS = CANDIDATE_VISIBILITY_PREFERENCE_FIELDS;
