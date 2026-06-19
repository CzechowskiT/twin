/** Company feedback — internal drafts only, no candidate leakage. */

import { fetchSafePersistenceList } from "@/lib/safe-persistence-api";

export const COMPANY_FEEDBACK_API_PATH = "/api/v1/company-feedback";

export const COMPANY_FEEDBACK_ROUTE = "/company/feedback";

export const COMPANY_FEEDBACK_MARKERS = {
  header: "company-feedback-header",
  list: "company-feedback-list",
  draftForm: "company-feedback-draft-form",
  reviewStatus: "company-feedback-review-status",
  visibilityBoundary: "company-feedback-visibility-boundary",
  auditTrail: "company-feedback-audit-trail",
  boundary: "company-feedback-boundary",
} as const;

export type SafePersistenceSource = "live" | "demo";

export type CompanyFeedbackRow = {
  id: string;
  candidate_ref: string;
  role_ref: string;
  status: string;
  rating_preview?: string | null;
};

export type CompanyFeedbackRecord = {
  items: CompanyFeedbackRow[];
};

type ApiFeedbackItem = {
  id: number;
  candidate_ref: string;
  role_ref: string;
  status: string;
  rating_preview?: string | null;
};

function getCompanyFeedbackDemo(): CompanyFeedbackRecord {
  return {
    items: [
      {
        id: "cf-demo-1",
        candidate_ref: "demo-candidate-001",
        role_ref: "demo-role-001",
        status: "draft",
        rating_preview: "preview",
      },
    ],
  };
}

export function resolveCompanyFeedback(): CompanyFeedbackRecord {
  return getCompanyFeedbackDemo();
}

export async function loadCompanyFeedback(): Promise<{
  source: SafePersistenceSource;
  record: CompanyFeedbackRecord;
}> {
  const demo = getCompanyFeedbackDemo();
  const result = await fetchSafePersistenceList<{ items: ApiFeedbackItem[] }>(COMPANY_FEEDBACK_API_PATH, {
    items: [],
  });
  if (result.source === "live" && result.data.items.length > 0) {
    return {
      source: "live",
      record: {
        items: result.data.items.map((row) => ({
          id: String(row.id),
          candidate_ref: row.candidate_ref,
          role_ref: row.role_ref,
          status: row.status,
          rating_preview: row.rating_preview,
        })),
      },
    };
  }
  return { source: result.source, record: demo };
}
