/** Recruiter & company placement verification checklist — routes and resolvers. */

import {
  getCompanyPlacementChecklistDemo,
  getRecruiterPlacementChecklistDemo,
  type PlacementChecklistRecord,
} from "@/lib/recruiter-company-placement-verification-checklist-demo-data";
import { placementVerificationSourceKey } from "@/lib/placement-verification";
import type { PlacementVerificationSource } from "@/lib/placement-verification";

export const RECRUITER_PLACEMENT_VERIFICATION_ROUTE = "/recruiter/placement-verification";
export const COMPANY_PLACEMENT_VERIFICATION_ROUTE = "/company/placement-verification";

export const RECRUITER_PLACEMENT_VERIFICATION_PAGE_MARKER = "recruiter-placement-verification-page";
export const COMPANY_PLACEMENT_VERIFICATION_PAGE_MARKER = "company-placement-verification-page";

export const RECRUITER_PLACEMENT_VERIFICATION_MARKERS = {
  page: RECRUITER_PLACEMENT_VERIFICATION_PAGE_MARKER,
  header: "recruiter-placement-verification-header",
  checklist: "recruiter-placement-verification-checklist",
  disabledActions: "recruiter-placement-verification-disabled-actions",
  operatingEvidence: "placement-verification-evidence-panel",
  crossLinks: "recruiter-placement-verification-cross-links",
  sourceBadge: "recruiter-placement-verification-source",
} as const;

export const COMPANY_PLACEMENT_VERIFICATION_MARKERS = {
  page: COMPANY_PLACEMENT_VERIFICATION_PAGE_MARKER,
  header: "company-placement-verification-header",
  checklist: "company-placement-verification-checklist",
  disabledActions: "company-placement-verification-disabled-actions",
  operatingEvidence: "placement-verification-evidence-panel",
  crossLinks: "company-placement-verification-cross-links",
  sourceBadge: "company-placement-verification-source",
} as const;

export function recruiterPlacementVerificationHref(): string {
  return RECRUITER_PLACEMENT_VERIFICATION_ROUTE;
}

export function companyPlacementVerificationHref(): string {
  return COMPANY_PLACEMENT_VERIFICATION_ROUTE;
}

export function resolveRecruiterPlacementChecklist(): PlacementChecklistRecord {
  return getRecruiterPlacementChecklistDemo();
}

export function resolveCompanyPlacementChecklist(): PlacementChecklistRecord {
  return getCompanyPlacementChecklistDemo();
}

export function checklistSource(): PlacementVerificationSource {
  return "demo";
}

export { placementVerificationSourceKey };
