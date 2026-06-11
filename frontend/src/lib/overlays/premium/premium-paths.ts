/** Dot-path prefixes that must not fall back to English for non-EN locales. */
export const PREMIUM_I18N_PREFIXES = [
  "nav.",
  "home.feature6",
  "login.",
  "register.",
  "dashboard.matchQuality",
  "dashboard.applicationTransparency",
  "dashboard.todayNba",
  "recruiterInbox.",
  "recruiterMessageDrafts.",
  "recruiterCalendar.",
  "demo.",
  "interactiveDemo.",
  "persona.",
  "ux.",
] as const;

export function isPremiumPath(path: string): boolean {
  return PREMIUM_I18N_PREFIXES.some((prefix) => path.startsWith(prefix));
}
