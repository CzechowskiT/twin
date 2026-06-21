/** Append-only audit event foundation — safe persistence layer. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getAuditEventFoundationDemo,
  type AuditEventFoundationRecord,
  type AuditEventSample,
} from "@/lib/audit-event-foundation-demo-data";

export { LAUNCH_STANCE };
export type { AuditEventFoundationRecord, AuditEventSample };

export const AUDIT_EVENT_FOUNDATION_ROUTE = "/board/audit-event-foundation";

export const AUDIT_EVENT_FOUNDATION_PAGE_MARKER = "audit-event-foundation-page";

export const AUDIT_EVENT_FOUNDATION_MARKERS = {
  page: AUDIT_EVENT_FOUNDATION_PAGE_MARKER,
  header: "audit-event-foundation-header",
  contract: "audit-event-foundation-contract",
  samples: "audit-event-foundation-samples",
  boundaries: "audit-event-foundation-boundaries",
  apiPreview: "audit-event-foundation-api-preview",
  launchStatus: "audit-event-foundation-launch-status",
  pilotBadge: "audit-event-foundation-pilot-badge",
} as const;

export const AUDIT_EVENT_FOUNDATION_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
  /persisted successfully/i,
  /saved successfully/i,
  /ATS sync completed/i,
  /verified successfully/i,
];

export const AUDIT_EVENT_FOUNDATION_LINKS = [
  { href: "/board/persistence-operations-monitor", labelKey: "liveOperatingState.monitorTitle" as TranslationKey },
  { href: "/board/first-working-persistence-plan", labelKey: "firstWorkingPersistencePlan.demoJourneyTitle" as TranslationKey },
  { href: "/board/working-data-readiness", labelKey: "workingDataReadiness.demoJourneyTitle" as TranslationKey },
] as const;

export const AUDIT_EVENT_API_PATH = "/api/v1/audit-events";

export function auditEventFoundationHref(): string {
  return AUDIT_EVENT_FOUNDATION_ROUTE;
}

export function resolveAuditEventFoundation(): AuditEventFoundationRecord {
  return getAuditEventFoundationDemo();
}
