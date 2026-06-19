/** Request intake append queue — internal human review only. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";

export { LAUNCH_STANCE };

export const REQUEST_INTAKE_RECRUITER_ROUTE = "/recruiter/request-intake";
export const REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE = "/dashboard/trust/request-intake-preview";
export const REQUEST_INTAKE_API_PATH = "/api/v1/request-intake";

export const REQUEST_INTAKE_PAGE_MARKER = "request-intake-page";

export const REQUEST_INTAKE_MARKERS = {
  page: REQUEST_INTAKE_PAGE_MARKER,
  header: "request-intake-header",
  queue: "request-intake-queue",
  boundary: "request-intake-boundary",
  trustReviewLink: "request-intake-trust-review-link",
} as const;

export function requestIntakeRecruiterHref(): string {
  return REQUEST_INTAKE_RECRUITER_ROUTE;
}

export function requestIntakeCandidatePreviewHref(): string {
  return REQUEST_INTAKE_CANDIDATE_PREVIEW_ROUTE;
}
