/** Candidate calendar OAuth readiness — preview surface (no live sync). */

import {
  calendarReadinessSourceKey,
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  resolveCalendarReadiness,
  type CalendarReadinessRecord,
} from "@/lib/calendar-readiness";
import { candidateCalendarHref } from "@/lib/persona-access";

export const CANDIDATE_CALENDAR_READINESS_ROUTE = "/dashboard/calendar/readiness";

export const CANDIDATE_CALENDAR_READINESS_PAGE_MARKER = "candidate-calendar-readiness-page";

export const CANDIDATE_CALENDAR_READINESS_MARKERS = {
  page: CANDIDATE_CALENDAR_READINESS_PAGE_MARKER,
  header: "candidate-calendar-readiness-header",
  stage: "candidate-calendar-readiness-stage",
  providers: "candidate-calendar-readiness-providers",
  publicHealth: "candidate-calendar-readiness-public-health",
  blocked: "candidate-calendar-readiness-blocked",
  scopes: "candidate-calendar-readiness-scopes",
  operatingEvidence: "calendar-readiness-evidence-panel",
  sourceBadge: "candidate-calendar-readiness-source",
  safeLinks: "candidate-calendar-readiness-safe-links",
  notFound: "candidate-calendar-readiness-not-found",
} as const;

export const CANDIDATE_CALENDAR_READINESS_SAFE_LINKS = {
  calendar: candidateCalendarHref(),
  dashboard: "/dashboard",
} as const;

export function candidateCalendarReadinessHref(): string {
  return CANDIDATE_CALENDAR_READINESS_ROUTE;
}

export function resolveCandidateCalendarReadiness(
  candidateId?: string,
): CalendarReadinessRecord | null {
  return resolveCalendarReadiness(candidateId ?? CALENDAR_READINESS_DEMO_CANDIDATE_ID);
}

export { calendarReadinessSourceKey, CALENDAR_READINESS_DEMO_CANDIDATE_ID };
