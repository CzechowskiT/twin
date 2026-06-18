export const COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID = "demo-candidate-001";

export type CompanyCandidateTrustSummaryRecord = {
  id: string;
  candidate_id: string;
  display_name: string;
  pilot_labelled: boolean;
  headline: string;
  visibility_items: string[];
  evidence_refs: { id: string; label_key: string }[];
  not_shared_items: string[];
  review_notes: string[];
};

export function getCompanyCandidateTrustSummaryDemo(): CompanyCandidateTrustSummaryRecord {
  return {
    id: "company-trust-summary-demo",
    candidate_id: COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID,
    display_name: "Demo Candidate 001",
    pilot_labelled: true,
    headline: "Company-visible trust summary — no private export JSON or PII.",
    visibility_items: [
      "companyCandidateTrustSummary.visibilityApplications",
      "companyCandidateTrustSummary.visibilityConsentBoundary",
      "companyCandidateTrustSummary.visibilityNoPrivateExport",
    ],
    evidence_refs: [
      { id: "ev1", label_key: "companyCandidateTrustSummary.visibilityConsentBoundary" },
    ],
    not_shared_items: [
      "companyCandidateTrustSummary.notSharedExportJson",
      "companyCandidateTrustSummary.notSharedIdentityDetails",
      "companyCandidateTrustSummary.notSharedLegalRequests",
    ],
    review_notes: [
      "companyCandidateTrustSummary.reviewNoteConsent",
      "companyCandidateTrustSummary.reviewNoteNoOutreach",
    ],
  };
}
