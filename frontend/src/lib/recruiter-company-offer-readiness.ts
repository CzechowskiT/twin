/** Recruiter & company offer readiness preview — read-only routes and resolvers. */

import {
  adaptCandidateOfferReadiness,
  offerReadinessSourceKey,
  resolveCandidateOfferReadiness,
  type OfferReadinessRecord,
} from "@/lib/offer-readiness";

export const RECRUITER_OFFER_READINESS_ROUTE = "/recruiter/offer-readiness";
export const COMPANY_OFFER_READINESS_ROUTE = "/company/offer-readiness";

export const RECRUITER_OFFER_READINESS_PAGE_MARKER = "recruiter-offer-readiness-page";
export const COMPANY_OFFER_READINESS_PAGE_MARKER = "company-offer-readiness-page";

export const RECRUITER_OFFER_READINESS_MARKERS = {
  page: RECRUITER_OFFER_READINESS_PAGE_MARKER,
  header: "recruiter-offer-readiness-header",
  preview: "recruiter-offer-readiness-preview",
  operatingEvidence: "offer-readiness-evidence-panel",
  crossLinks: "recruiter-offer-readiness-cross-links",
  sourceBadge: "recruiter-offer-readiness-source",
} as const;

export const COMPANY_OFFER_READINESS_MARKERS = {
  page: COMPANY_OFFER_READINESS_PAGE_MARKER,
  header: "company-offer-readiness-header",
  preview: "company-offer-readiness-preview",
  operatingEvidence: "offer-readiness-evidence-panel",
  crossLinks: "company-offer-readiness-cross-links",
  sourceBadge: "company-offer-readiness-source",
} as const;

export function recruiterOfferReadinessHref(): string {
  return RECRUITER_OFFER_READINESS_ROUTE;
}

export function companyOfferReadinessHref(): string {
  return COMPANY_OFFER_READINESS_ROUTE;
}

export function resolveRecruiterOfferReadinessPreview(): OfferReadinessRecord | null {
  const record = resolveCandidateOfferReadiness();
  return record ? adaptCandidateOfferReadiness(record) : null;
}

export function resolveCompanyOfferReadinessPreview(): OfferReadinessRecord | null {
  return resolveRecruiterOfferReadinessPreview();
}

export function offerReadinessPreviewSource(): "demo" {
  return "demo";
}

export { offerReadinessSourceKey };
