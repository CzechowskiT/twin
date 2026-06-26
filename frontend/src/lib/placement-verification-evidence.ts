/** Placement verification operating evidence — read-only resolver and cross-links. */

import { PLACEMENT_EVENTS_API_PATH } from "@/lib/placement-events-live";
import {
  capabilityStatusKey,
  operatingEvidenceLastCheckedDemo,
  operatingEvidenceSourceKey,
  type CapabilityRow,
  type OperatingEvidenceSnapshot,
} from "@/lib/operating-evidence";
import {
  PLACEMENT_VERIFICATION_DEMO_ID,
  resolvePlacementVerification,
  type PlacementVerificationRecord,
} from "@/lib/placement-verification";
import type { TranslationKey } from "@/lib/i18n";

export const PLACEMENT_VERIFICATION_EVIDENCE_DOC =
  "docs/PLACEMENT_VERIFICATION_OPERATING_EVIDENCE_2026-06-23.md";

export const PLACEMENT_VERIFICATION_EVIDENCE_MARKERS = {
  panel: "placement-verification-evidence-panel",
  statusSummary: "placement-verification-evidence-status",
  evidenceBundle: "placement-verification-evidence-bundle",
  timelineNote: "placement-verification-evidence-timeline-note",
  crossLinks: "placement-verification-evidence-cross-links",
  emptyState: "placement-verification-evidence-empty",
} as const;

export const PLACEMENT_VERIFICATION_EVIDENCE_CROSS_LINKS = [
  {
    id: "calendar_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "calendarReadinessEvidence.panelTitle" as TranslationKey,
  },
  {
    id: "work_queue",
    href: "/recruiter/operational-work-queue",
    labelKey: "recruiterOperationalWorkQueue.pageTitle" as TranslationKey,
  },
  {
    id: "audit_monitor",
    href: "/board/persistence-operations-monitor",
    labelKey: "liveOperatingState.monitorTitle" as TranslationKey,
  },
  {
    id: "board_calendar",
    href: "/board/calendar-readiness",
    labelKey: "boardCalendarReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "trust_overview",
    href: "/dashboard/trust/overview",
    labelKey: "candidateTrustOverview.pageTitle" as TranslationKey,
  },
  {
    id: "hiring_journey",
    href: "/dashboard/hiring-journey",
    labelKey: "hiringJourney.crossLinkHiringJourney" as TranslationKey,
  },
] as const;

export type PlacementVerificationEvidenceBundle = {
  record: PlacementVerificationRecord;
  snapshot: OperatingEvidenceSnapshot;
  capabilities: readonly CapabilityRow[];
  timeline_endpoint: string;
};

const PLACEMENT_CAPABILITIES: CapabilityRow[] = [
  {
    id: "events_timeline",
    labelKey: "placementVerificationEvidence.capEventsTimeline",
    detailKey: "placementVerificationEvidence.capEventsTimelineDetail",
    status: "preview",
  },
  {
    id: "evidence_items",
    labelKey: "placementVerificationEvidence.capEvidenceItems",
    detailKey: "placementVerificationEvidence.capEvidenceItemsDetail",
    status: "preview",
  },
  {
    id: "external_confirmation",
    labelKey: "placementVerificationEvidence.capExternalConfirm",
    detailKey: "placementVerificationEvidence.capExternalConfirmDetail",
    status: "blocked",
  },
  {
    id: "billing",
    labelKey: "placementVerificationEvidence.capBilling",
    detailKey: "placementVerificationEvidence.capBillingDetail",
    status: "blocked",
  },
];

export function resolvePlacementVerificationEvidence(
  placementId?: string,
): PlacementVerificationEvidenceBundle | null {
  const record = resolvePlacementVerification(placementId ?? PLACEMENT_VERIFICATION_DEMO_ID);
  if (!record) return null;

  const snapshot: OperatingEvidenceSnapshot = {
    source: record.source,
    last_checked_at: operatingEvidenceLastCheckedDemo(),
    status_summary_key: "placementVerificationEvidence.statusSummary",
    status_detail_key: "placementVerificationEvidence.statusDetail",
  };

  return {
    record,
    snapshot,
    capabilities: PLACEMENT_CAPABILITIES,
    timeline_endpoint: PLACEMENT_EVENTS_API_PATH,
  };
}

export { operatingEvidenceSourceKey, capabilityStatusKey, PLACEMENT_EVENTS_API_PATH };
