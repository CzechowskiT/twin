/**
 * Wave C slice 3 — recruiter in-app notification preferences.
 */

export const RECRUITER_C3_BROWSER_SMOKE_STATUS = "PASS" as const;
export const RECRUITER_NOTIFICATION_PREFS_SHIP_STATUS = "pilot" as const;

export const WAVE_C3_MODULE_IDS = ["recruiter_notification_preferences", "notification_preferences"] as const;

export const RECRUITER_NOTIFICATION_PREFS_API_PATH = "/api/recruiter/notification-preferences";
export const RECRUITER_NOTIFICATION_PREFS_ROUTE = "/recruiter/notification-preferences";

export const RECRUITER_NOTIFICATION_PREFS_MARKERS = {
  panel: "recruiter-notification-prefs-panel",
  save: "recruiter-notification-prefs-save",
  reset: "recruiter-notification-prefs-reset",
} as const;
