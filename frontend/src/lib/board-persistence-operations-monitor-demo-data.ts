/** Board persistence operations monitor — deterministic ops verification data. */

import type { PersistenceEndpointRow } from "@/lib/production-persistence-status-demo-data";

export type PublicHealthSnapshot = {
  status: string;
  db_ok: boolean;
  frontend_commit: string;
  api_commit: string;
  commit_interpretation: string;
  source: "live" | "static";
};

export type AuthSmokeSummary = {
  pass: number;
  fail: number;
  skip: number;
  detail: string;
};

export type OperationalSurfaceRow = {
  id: string;
  route: string;
  persona: string;
  channels: string;
  status: "live_ready" | "demo_fallback" | "partial";
};

export type BlockedCapabilityRow = {
  id: string;
  label: string;
  reason: string;
};

export type BoardPersistenceOperationsMonitorRecord = {
  expectedAlembicHead: string;
  alembicEvidence: string;
  publicHealthFallback: PublicHealthSnapshot;
  authSmoke: AuthSmokeSummary;
  endpoints: readonly PersistenceEndpointRow[];
  operationalSurfaces: readonly OperationalSurfaceRow[];
  blockedCapabilities: readonly BlockedCapabilityRow[];
};

const ENDPOINTS: PersistenceEndpointRow[] = [
  { id: "audit", path: "/api/v1/audit-events", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST append-only event" },
  { id: "work", path: "/api/v1/work-items", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST internal task" },
  { id: "role", path: "/api/v1/candidate-role-status", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST needs_feedback status" },
  { id: "queue", path: "/api/v1/review-queue", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST trust_audit_review" },
  { id: "feedback", path: "/api/v1/company-feedback", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST draft feedback" },
  { id: "visibility", path: "/api/v1/candidate-visibility-preferences", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST pilot_visible prefs" },
  { id: "export", path: "/api/v1/export-requests", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST preview_created export" },
  { id: "intake", path: "/api/v1/request-intake", methods: "GET, POST, PATCH", unauthExpected: "401", authSmoke: "POST correction_preview intake" },
  { id: "placement_events", path: "/api/v1/placement-events", methods: "GET, POST", unauthExpected: "401", authSmoke: "POST demo_verification_recorded" },
];

export function getBoardPersistenceOperationsMonitorDemo(): BoardPersistenceOperationsMonitorRecord {
  return {
    expectedAlembicHead: "068_placement_events_foundation",
    alembicEvidence: "CONFIRMED — 068_placement_events_foundation (2026-06-21 admin migrations endpoint)",
    publicHealthFallback: {
      status: "ok",
      db_ok: true,
      frontend_commit: "e2b7b66",
      api_commit: "a794812",
      commit_interpretation: "frontend and api SHAs may differ on partial deploys — verify migration head separately",
      source: "static",
    },
    authSmoke: {
      pass: 11,
      fail: 0,
      skip: 1,
      detail: "11 pass / 0 fail / 1 skip — persistence PASS 2026-06-21; placement-events dedicated 6/0/1 PASS 2026-06-23",
    },
    endpoints: ENDPOINTS,
    operationalSurfaces: [
      { id: "daily_cockpit", route: "/recruiter/daily-cockpit", persona: "recruiter", channels: "6", status: "live_ready" },
      { id: "operational_queue", route: "/recruiter/operational-work-queue", persona: "recruiter", channels: "aggregated", status: "demo_fallback" },
      { id: "request_intake", route: "/recruiter/request-intake", persona: "recruiter", channels: "request-intake", status: "live_ready" },
      { id: "trust_review", route: "/recruiter/trust-review-queue", persona: "recruiter", channels: "review-queue", status: "live_ready" },
      { id: "command_center", route: "/company/hiring-command-center", persona: "company", channels: "4", status: "live_ready" },
      { id: "company_feedback", route: "/company/feedback", persona: "company", channels: "company-feedback", status: "live_ready" },
      { id: "trust_overview", route: "/dashboard/trust/overview", persona: "candidate", channels: "4 trust APIs", status: "live_ready" },
      { id: "board_monitor", route: "/board/persistence-operations-monitor", persona: "board", channels: "cross-persona", status: "live_ready" },
      { id: "board_placement", route: "/board/placement-verification", persona: "board", channels: "placement-events-timeline", status: "live_ready" },
      { id: "candidate_placement", route: "/dashboard/placement-verification", persona: "candidate", channels: "placement-events-timeline", status: "live_ready" },
      { id: "recruiter_placement", route: "/recruiter/placement-verification", persona: "recruiter", channels: "placement-events-timeline", status: "live_ready" },
      { id: "company_placement", route: "/company/placement-verification", persona: "company", channels: "placement-events-timeline", status: "live_ready" },
    ],
    blockedCapabilities: [
      { id: "email", label: "Email outbound", reason: "Not live — no message sent copy" },
      { id: "ats", label: "ATS writeback", reason: "Not live — no sync completed copy" },
      { id: "delete_revoke", label: "Delete / revoke fulfillment", reason: "Preview only — no destructive writes" },
      { id: "legal", label: "Legal fulfillment", reason: "No export fulfilled or compliance claims" },
      { id: "kyc", label: "KYC / identity verification", reason: "Preview workflow — not verified successfully" },
      { id: "phase3b", label: "Phase 3B multitab", reason: "HARD BLOCKED — controlled browser only" },
    ],
  };
}
