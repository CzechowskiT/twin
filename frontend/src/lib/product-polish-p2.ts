/**
 * Product Polish 1.0 P2 — frontend surface controls (calendar, billing, badges).
 */
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

/** Honest calendar provider tiers for limited launch. */
export const CALENDAR_PROVIDER_TIERS = {
  google: "live",
  microsoft: "coming_soon",
  ics: "preview",
} as const satisfies Record<string, WorkspaceModuleStatus>;

export type CalendarProviderTierKey = keyof typeof CALENDAR_PROVIDER_TIERS;

/** Microsoft calendar stays coming soon in product copy even when OAuth exists in env. */
export const FORCE_MICROSOFT_CALENDAR_COMING_SOON = true;

/** Billing surfaces show Premium Preview — no fake checkout impression. */
export const BILLING_PREMIUM_PREVIEW_ONLY = true;

/** Pilot submodule pages use shared header + WorkspaceStatusBadge. */
export const USE_WORKSPACE_PILOT_PAGE_HEADERS = true;

/** Investor public room hides duplicate preview module grid. */
export const INVESTOR_ROOM_SIMPLIFIED_PREVIEW = true;
