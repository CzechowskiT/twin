/**
 * Wave C recruiter activation — onboarding persistence through first decision event.
 * Aligns with LIMITED_RECRUITER_PILOT_TRACKER R1 activation dimension.
 */

/** Daily cockpit activation stays PILOT until founder browser smoke. */
export const RECRUITER_ACTIVATION_BROWSER_SMOKE_STATUS = "NEEDS_FOUNDER_AUTH_SMOKE" as const;

export const RECRUITER_ACTIVATION_SHIP_STATUS = "pilot" as const;

/** Show activation onboarding panel on recruiter hub (Wave C slice 1). */
export const SHOW_RECRUITER_HUB_ACTIVATION_PANEL = true;

/** Module IDs covered by Wave C slice 1 persistence. */
export const WAVE_C1_ACTIVATION_MODULE_IDS = [
  "recruiter_daily_cockpit",
  "daily_cockpit",
] as const;
