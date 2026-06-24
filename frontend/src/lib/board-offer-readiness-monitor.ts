/** Board offer readiness monitor — cross-persona demo proof. */

import {
  offerReadinessSourceKey,
  OFFER_READINESS_DEMO_CANDIDATE_ID,
  OFFER_READINESS_DEMO_ROLE_ID,
} from "@/lib/offer-readiness";
import type { TranslationKey } from "@/lib/i18n";

export const BOARD_OFFER_READINESS_ROUTE = "/board/offer-readiness";

export const BOARD_OFFER_READINESS_PAGE_MARKER = "board-offer-readiness-monitor-page";

export const BOARD_OFFER_READINESS_MARKERS = {
  page: BOARD_OFFER_READINESS_PAGE_MARKER,
  header: "board-offer-readiness-header",
  evidenceMatrix: "board-offer-readiness-evidence-matrix",
  safetyBoundaries: "board-offer-readiness-safety-boundaries",
  operatingEvidence: "offer-readiness-evidence-panel",
  personaRoutes: "board-offer-readiness-persona-routes",
  crossLinks: "board-offer-readiness-cross-links",
  sourceBadge: "board-offer-readiness-source",
} as const;

export type BoardOfferReadinessMatrixRow = {
  id: string;
  persona: string;
  route: string;
  evidence_kind: string;
  status: "preview_ready" | "read_only" | "blocked";
};

export type BoardOfferReadinessMonitorRecord = {
  candidate_id: string;
  role_id: string;
  evidence_matrix: readonly BoardOfferReadinessMatrixRow[];
  safety_note_key: TranslationKey;
  demo_source: "demo";
};

export const BOARD_OFFER_READINESS_LINKS = [
  {
    id: "candidate_route",
    href: "/dashboard/offer-readiness",
    labelKey: "candidateOfferReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "recruiter_route",
    href: "/recruiter/offer-readiness",
    labelKey: "offerReadinessPreview.recruiterPageTitle" as TranslationKey,
  },
  {
    id: "company_route",
    href: "/company/offer-readiness",
    labelKey: "offerReadinessPreview.companyPageTitle" as TranslationKey,
  },
  {
    id: "placement_verification",
    href: "/board/placement-verification",
    labelKey: "boardPlacementEvidence.pageTitle" as TranslationKey,
  },
] as const;

const DEMO_MATRIX: BoardOfferReadinessMatrixRow[] = [
  {
    id: "candidate_dashboard",
    persona: "candidate",
    route: "/dashboard/offer-readiness",
    evidence_kind: "readiness_checklist",
    status: "preview_ready",
  },
  {
    id: "candidate_profile",
    persona: "candidate",
    route: "/profile/offer-readiness",
    evidence_kind: "readiness_checklist",
    status: "preview_ready",
  },
  {
    id: "recruiter_preview",
    persona: "recruiter",
    route: "/recruiter/offer-readiness",
    evidence_kind: "read_only_preview",
    status: "read_only",
  },
  {
    id: "company_preview",
    persona: "company",
    route: "/company/offer-readiness",
    evidence_kind: "read_only_preview",
    status: "read_only",
  },
  {
    id: "board_monitor",
    persona: "board",
    route: "/board/offer-readiness",
    evidence_kind: "safety_proof",
    status: "preview_ready",
  },
];

export function boardOfferReadinessMonitorHref(): string {
  return BOARD_OFFER_READINESS_ROUTE;
}

export function resolveBoardOfferReadinessMonitor(): BoardOfferReadinessMonitorRecord {
  return {
    candidate_id: OFFER_READINESS_DEMO_CANDIDATE_ID,
    role_id: OFFER_READINESS_DEMO_ROLE_ID,
    evidence_matrix: DEMO_MATRIX,
    safety_note_key: "boardOfferReadiness.safetyNote",
    demo_source: "demo",
  };
}

export { offerReadinessSourceKey };
