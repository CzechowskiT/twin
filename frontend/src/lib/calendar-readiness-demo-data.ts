/** Microsoft calendar OAuth readiness — deterministic demo records (preview only). */

export const CALENDAR_READINESS_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const CALENDAR_PROVIDER_ALLOWLIST = [
  "google",
  "microsoft",
  "ics_webcal",
  "apple_caldav",
] as const;

export type CalendarProviderKind = (typeof CALENDAR_PROVIDER_ALLOWLIST)[number];

export const OAUTH_CONFIG_STATUS_ALLOWLIST = [
  "configured",
  "not_configured",
  "partial",
  "blocked",
] as const;

export type OAuthConfigStatus = (typeof OAUTH_CONFIG_STATUS_ALLOWLIST)[number];

export const CALENDAR_READINESS_STAGE_ALLOWLIST = [
  "not_started",
  "oauth_env_preview",
  "busy_read_preview",
  "hold_write_blocked",
  "readiness_preview",
] as const;

export type CalendarReadinessStage = (typeof CALENDAR_READINESS_STAGE_ALLOWLIST)[number];

export type CalendarProviderRow = {
  id: string;
  provider: CalendarProviderKind;
  oauth_status: OAuthConfigStatus;
  busy_read: "preview_only" | "blocked" | "live_ready";
  event_write: "blocked" | "preview_only";
  note: string;
};

export type BlockedCalendarCapability = {
  id: string;
  label: string;
  reason: string;
};

export type PublicHealthCalendarFlags = {
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
};

export type CalendarReadinessSource = "demo" | "live" | "partial";

export type CalendarReadinessRecord = {
  candidate_id: string;
  readiness_stage: CalendarReadinessStage;
  providers: readonly CalendarProviderRow[];
  public_health: PublicHealthCalendarFlags;
  blocked_capabilities: readonly BlockedCalendarCapability[];
  source: CalendarReadinessSource;
  headline: string;
  scopes_preview: readonly string[];
};

const PROVIDERS: CalendarProviderRow[] = [
  {
    id: "google",
    provider: "google",
    oauth_status: "configured",
    busy_read: "live_ready",
    event_write: "preview_only",
    note: "Google Calendar OAuth shipped — busy read + hold preview where configured; no invite claims in readiness slice.",
  },
  {
    id: "microsoft",
    provider: "microsoft",
    oauth_status: "partial",
    busy_read: "preview_only",
    event_write: "blocked",
    note: "Microsoft Graph OAuth readiness preview — env flag from public-health; Graph writes blocked in this slice.",
  },
  {
    id: "ics",
    provider: "ics_webcal",
    oauth_status: "configured",
    busy_read: "preview_only",
    event_write: "blocked",
    note: "ICS download + WebCal subscribe — universal fallback; preview only in readiness monitor.",
  },
  {
    id: "apple",
    provider: "apple_caldav",
    oauth_status: "not_configured",
    busy_read: "blocked",
    event_write: "blocked",
    note: "Apple Calendar via CalDAV/ICS subscribe — no single Sign in with Apple Calendar for arbitrary apps.",
  },
];

const BLOCKED: BlockedCalendarCapability[] = [
  { id: "graph_write", label: "Microsoft Graph event write", reason: "Blocked — no calendar sync or event create/update/delete in readiness slice." },
  { id: "invite_send", label: "Interview invite send", reason: "Blocked — scheduling proof preview only; no outbound invite claims." },
  { id: "email_notify", label: "Calendar email notifications", reason: "Blocked — no email or notification claims." },
  { id: "recruiter_sync", label: "Recruiter calendar sync", reason: "Blocked — recruiter scheduling proof is read-only preview." },
  { id: "phase3b", label: "Phase 3B multitab stress", reason: "Hard blocked — not in scope for calendar readiness batch." },
  { id: "token_display", label: "OAuth token display", reason: "Blocked — no token surfaced in UI or docs." },
];

export function getCalendarReadinessDemo(): CalendarReadinessRecord {
  return {
    candidate_id: CALENDAR_READINESS_DEMO_CANDIDATE_ID,
    readiness_stage: "readiness_preview",
    providers: PROVIDERS,
    public_health: {
      google_calendar_configured: true,
      microsoft_calendar_configured: false,
    },
    blocked_capabilities: BLOCKED,
    source: "demo",
    headline: "Calendar OAuth readiness preview — Microsoft Graph env wiring check, no live sync.",
    scopes_preview: ["offline_access", "User.Read", "Calendars.Read"],
  };
}

export function isAllowedCalendarProvider(value: string): value is CalendarProviderKind {
  return (CALENDAR_PROVIDER_ALLOWLIST as readonly string[]).includes(value);
}

export function isAllowedOAuthConfigStatus(value: string): value is OAuthConfigStatus {
  return (OAUTH_CONFIG_STATUS_ALLOWLIST as readonly string[]).includes(value);
}

export function isAllowedCalendarReadinessStage(value: string): value is CalendarReadinessStage {
  return (CALENDAR_READINESS_STAGE_ALLOWLIST as readonly string[]).includes(value);
}
