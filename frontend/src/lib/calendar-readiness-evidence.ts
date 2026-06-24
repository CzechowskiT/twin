/** Calendar readiness operating evidence — read-only resolver and capability matrix. */

import {
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  mergePublicHealthCalendarFlags,
  resolveCalendarReadiness,
  type CalendarReadinessRecord,
} from "@/lib/calendar-readiness";
import {
  capabilityStatusKey,
  operatingEvidenceLastCheckedDemo,
  operatingEvidenceSourceKey,
  type CapabilityRow,
  type OperatingEvidenceSnapshot,
} from "@/lib/operating-evidence";
import type { TranslationKey } from "@/lib/i18n";

export const CALENDAR_READINESS_EVIDENCE_DOC =
  "docs/CALENDAR_READINESS_OPERATING_EVIDENCE_2026-06-23.md";

export const CALENDAR_READINESS_EVIDENCE_MARKERS = {
  panel: "calendar-readiness-evidence-panel",
  oauthStatus: "calendar-readiness-evidence-oauth",
  readinessStatus: "calendar-readiness-evidence-readiness",
  capabilityMatrix: "calendar-readiness-evidence-capabilities",
  crossLinks: "calendar-readiness-evidence-cross-links",
  emptyState: "calendar-readiness-evidence-empty",
} as const;

export const CALENDAR_READINESS_EVIDENCE_CROSS_LINKS = [
  {
    id: "readiness_route",
    href: "/dashboard/calendar/readiness",
    labelKey: "candidateCalendarReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "placement_verification",
    href: "/dashboard/placement-verification",
    labelKey: "placementVerificationEvidence.panelTitle" as TranslationKey,
  },
  {
    id: "trust_overview",
    href: "/dashboard/trust/overview",
    labelKey: "candidateTrustOverview.pageTitle" as TranslationKey,
  },
] as const;

export type CalendarReadinessEvidenceBundle = {
  record: CalendarReadinessRecord;
  snapshot: OperatingEvidenceSnapshot;
  capabilities: readonly CapabilityRow[];
  smoke_status: "preview_only";
  route_health: "ok";
};

function buildCapabilities(record: CalendarReadinessRecord): CapabilityRow[] {
  const googleConfigured = record.public_health.google_calendar_configured;
  const microsoftConfigured = record.public_health.microsoft_calendar_configured;

  return [
    {
      id: "oauth_configured",
      labelKey: "calendarReadinessEvidence.capOauthConfigured",
      detailKey: "calendarReadinessEvidence.capOauthConfiguredDetail",
      status: googleConfigured || microsoftConfigured ? "preview" : "blocked",
    },
    {
      id: "read_readiness",
      labelKey: "calendarReadinessEvidence.capReadReadiness",
      detailKey: "calendarReadinessEvidence.capReadReadinessDetail",
      status: "preview",
    },
    {
      id: "writes_disabled",
      labelKey: "calendarReadinessEvidence.capWritesDisabled",
      detailKey: "calendarReadinessEvidence.capWritesDisabledDetail",
      status: "blocked",
    },
    {
      id: "smoke_status",
      labelKey: "calendarReadinessEvidence.capSmokeStatus",
      detailKey: "calendarReadinessEvidence.capSmokeStatusDetail",
      status: "preview",
    },
    {
      id: "route_health",
      labelKey: "calendarReadinessEvidence.capRouteHealth",
      detailKey: "calendarReadinessEvidence.capRouteHealthDetail",
      status: "ready",
    },
  ];
}

export function resolveCalendarReadinessEvidence(
  candidateId?: string,
): CalendarReadinessEvidenceBundle | null {
  const base = resolveCalendarReadiness(candidateId ?? CALENDAR_READINESS_DEMO_CANDIDATE_ID);
  if (!base) return null;

  const record = mergePublicHealthCalendarFlags(base, {});

  const snapshot: OperatingEvidenceSnapshot = {
    source: record.source,
    last_checked_at: operatingEvidenceLastCheckedDemo(),
    status_summary_key: "calendarReadinessEvidence.statusSummary",
    status_detail_key: "calendarReadinessEvidence.statusDetail",
  };

  return {
    record,
    snapshot,
    capabilities: buildCapabilities(record),
    smoke_status: "preview_only",
    route_health: "ok",
  };
}

export { operatingEvidenceSourceKey, capabilityStatusKey };
