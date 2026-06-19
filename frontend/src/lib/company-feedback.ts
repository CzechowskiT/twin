/** Company feedback — internal drafts only, no candidate leakage. */

import { fetchSafePersistenceList, patchSafePersistence, postSafePersistence, type SafePersistenceWriteResult } from "@/lib/safe-persistence-api";

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

export async function createCompanyFeedbackDraft(input: {
  candidate_ref: string;
  role_ref: string;
  rating_preview?: string;
}): Promise<SafePersistenceWriteResult<ApiFeedbackItem>> {
  return postSafePersistence<ApiFeedbackItem>(COMPANY_FEEDBACK_API_PATH, {
    candidate_ref: input.candidate_ref,
    role_ref: input.role_ref,
    status: "draft",
    rating_preview: input.rating_preview ?? "preview",
  });
}

export async function submitCompanyFeedbackForReview(itemId: string): Promise<SafePersistenceWriteResult<ApiFeedbackItem>> {
  return patchSafePersistence<ApiFeedbackItem>(`${COMPANY_FEEDBACK_API_PATH}/${itemId}`, {
    status: "submitted_for_review",
  });
}
