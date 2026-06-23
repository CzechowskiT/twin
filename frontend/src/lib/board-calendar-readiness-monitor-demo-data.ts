/** Board calendar readiness monitor — deterministic demo data. */

import { getCalendarReadinessDemo, type BlockedCalendarCapability, type CalendarProviderRow } from "@/lib/calendar-readiness-demo-data";

export type PersonaRouteRow = {
  id: string;
  route: string;
  persona: string;
};

export type BoardCalendarReadinessMonitorRecord = {
  providers: readonly CalendarProviderRow[];
  public_health: { google_calendar_configured: boolean; microsoft_calendar_configured: boolean };
  blocked_capabilities: readonly BlockedCalendarCapability[];
  persona_routes: readonly PersonaRouteRow[];
  headline: string;
};

export function getBoardCalendarReadinessMonitorDemo(): BoardCalendarReadinessMonitorRecord {
  const base = getCalendarReadinessDemo();
  return {
    providers: base.providers,
    public_health: base.public_health,
    blocked_capabilities: base.blocked_capabilities,
    persona_routes: [
      { id: "candidate", route: "/dashboard/calendar/readiness", persona: "candidate" },
      { id: "calendar", route: "/dashboard/calendar", persona: "candidate" },
      { id: "recruiter_cockpit", route: "/recruiter/daily-cockpit", persona: "recruiter" },
      { id: "company_command", route: "/company/hiring-command-center", persona: "company" },
      { id: "board", route: "/board/calendar-readiness", persona: "board" },
    ],
    headline: base.headline,
  };
}
