interface StringTree {
  [key: string]: string | StringTree;
}

function isStringTree(value: unknown): value is StringTree {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Premium product surfaces audited for full locale coverage (slices #52–#59). */
export function extractPremiumTree(source: StringTree): Record<string, unknown> {
  const dash = source.dashboard;
  const dashboardPremium: Record<string, string> = {};
  if (isStringTree(dash)) {
    for (const [key, value] of Object.entries(dash)) {
      if (typeof value !== "string") continue;
      if (
        key.startsWith("matchQuality") ||
        key.startsWith("applicationTransparency") ||
        key.startsWith("todayNba") ||
        key === "calendarConfiguredHint" ||
        key.startsWith("calendarConnectedSuccess")
      ) {
        dashboardPremium[key] = value;
      }
    }
  }

  const home = source.home;
  const homePremium =
    isStringTree(home) && typeof home.feature6Title === "string" && typeof home.feature6Line === "string"
      ? { feature6Title: home.feature6Title, feature6Line: home.feature6Line }
      : {};

  return {
    nav: source.nav,
    home: homePremium,
    login: source.login,
    register: source.register,
    dashboard: dashboardPremium,
    recruiterInbox: source.recruiterInbox,
    recruiterSearch: source.recruiterSearch,
    recruiterScheduling: source.recruiterScheduling,
    recruiterPipeline: source.recruiterPipeline,
    recruiterCalendar: source.recruiterCalendar,
    demo: source.demo,
    interactiveDemo: source.interactiveDemo,
    persona: source.persona,
    ux: source.ux,
  };
}
