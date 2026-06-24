/** Offer readiness operating evidence — read-only resolver and cross-links. */

import {
  capabilityStatusKey,
  operatingEvidenceLastCheckedDemo,
  operatingEvidenceSourceKey,
  type CapabilityRow,
  type OperatingEvidenceSnapshot,
} from "@/lib/operating-evidence";
import {
  OFFER_READINESS_DEMO_CANDIDATE_ID,
  resolveCandidateOfferReadiness,
  type OfferReadinessRecord,
} from "@/lib/offer-readiness";
import type { TranslationKey } from "@/lib/i18n";

export const OFFER_READINESS_EVIDENCE_DOC = "docs/OFFER_READINESS_CENTER_2026-06-24.md";

export const OFFER_READINESS_EVIDENCE_MARKERS = {
  panel: "offer-readiness-evidence-panel",
  statusSummary: "offer-readiness-evidence-status",
  checklistSummary: "offer-readiness-evidence-checklist",
  capabilityMatrix: "offer-readiness-evidence-capabilities",
  crossLinks: "offer-readiness-evidence-cross-links",
  emptyState: "offer-readiness-evidence-empty",
} as const;

export const OFFER_READINESS_EVIDENCE_CROSS_LINKS = [
  {
    id: "placement_verification",
    href: "/dashboard/placement-verification",
    labelKey: "placementVerificationEvidence.panelTitle" as TranslationKey,
  },
  {
    id: "calendar_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "calendarReadinessEvidence.panelTitle" as TranslationKey,
  },
  {
    id: "trust_overview",
    href: "/dashboard/trust/overview",
    labelKey: "candidateTrustOverview.pageTitle" as TranslationKey,
  },
  {
    id: "control_center",
    href: "/dashboard/trust/controls",
    labelKey: "candidateControlCenter.pageTitle" as TranslationKey,
  },
  {
    id: "board_monitor",
    href: "/board/offer-readiness",
    labelKey: "boardOfferReadiness.pageTitle" as TranslationKey,
  },
] as const;

export type OfferReadinessEvidenceBundle = {
  record: OfferReadinessRecord;
  snapshot: OperatingEvidenceSnapshot;
  capabilities: readonly CapabilityRow[];
  smoke_status: "preview_only";
};

const OFFER_CAPABILITIES: CapabilityRow[] = [
  {
    id: "readiness_preview",
    labelKey: "offerReadinessEvidence.capReadinessPreview",
    detailKey: "offerReadinessEvidence.capReadinessPreviewDetail",
    status: "preview",
  },
  {
    id: "comparison_demo",
    labelKey: "offerReadinessEvidence.capComparisonDemo",
    detailKey: "offerReadinessEvidence.capComparisonDemoDetail",
    status: "preview",
  },
  {
    id: "offer_send",
    labelKey: "offerReadinessEvidence.capOfferSend",
    detailKey: "offerReadinessEvidence.capOfferSendDetail",
    status: "blocked",
  },
  {
    id: "contract_sign",
    labelKey: "offerReadinessEvidence.capContractSign",
    detailKey: "offerReadinessEvidence.capContractSignDetail",
    status: "blocked",
  },
  {
    id: "payment",
    labelKey: "offerReadinessEvidence.capPayment",
    detailKey: "offerReadinessEvidence.capPaymentDetail",
    status: "blocked",
  },
];

export function resolveOfferReadinessEvidence(
  candidateId?: string,
): OfferReadinessEvidenceBundle | null {
  const record = resolveCandidateOfferReadiness(candidateId ?? OFFER_READINESS_DEMO_CANDIDATE_ID);
  if (!record) return null;

  const snapshot: OperatingEvidenceSnapshot = {
    source: record.source,
    last_checked_at: operatingEvidenceLastCheckedDemo(),
    status_summary_key: "offerReadinessEvidence.statusSummary",
    status_detail_key: "offerReadinessEvidence.statusDetail",
  };

  return {
    record,
    snapshot,
    capabilities: OFFER_CAPABILITIES,
    smoke_status: "preview_only",
  };
}

export { operatingEvidenceSourceKey, capabilityStatusKey };
