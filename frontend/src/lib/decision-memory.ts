/** Unified decision memory / audit trail — recruiter/company executive cockpit (pilot). */

import {
  DECISION_MEMORY_DEMO_ID,
  getDecisionMemoryDemo,
  type DecisionMemoryRecord,
} from "@/lib/decision-memory-demo-data";

export { DECISION_MEMORY_DEMO_ID };

export const DECISION_MEMORY_PAGE_MARKER = "decision-memory-page";

export const DECISION_MEMORY_MARKERS = {
  page: DECISION_MEMORY_PAGE_MARKER,
  header: "decision-memory-header",
  timeline: "decision-memory-timeline",
  evidence: "decision-memory-evidence",
  decisionState: "decision-memory-decision-state",
  blockers: "decision-memory-blockers",
  nextActions: "decision-memory-next-actions",
  auditIntegrity: "decision-memory-audit-integrity",
  humanBoundary: "decision-memory-human-boundary",
  notFound: "decision-memory-not-found",
  pilotBadge: "decision-memory-pilot-badge",
} as const;

export const RECRUITER_CANDIDATES_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATES_ROUTE = "/company/candidates";
export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type DecisionMemorySurface = "recruiter" | "company";

export function decisionMemoryHref(
  candidateId: string,
  surface: DecisionMemorySurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/decision-memory`;
}

export function jobDecisionMemoryHref(
  jobId: string,
  surface: DecisionMemorySurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/decision-memory`;
}

export function resolveDecisionMemory(candidateId: string): DecisionMemoryRecord | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === DECISION_MEMORY_DEMO_ID) {
    return getDecisionMemoryDemo();
  }
  return null;
}
