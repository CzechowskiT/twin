export type MeetingProvider = "google_meet" | "teams" | "zoom" | "other";

export function detectMeetingProvider(url: string | null | undefined): MeetingProvider | null {
  const u = (url ?? "").trim().toLowerCase();
  if (!u) return null;
  if (u.includes("meet.google.com") || u.includes("google.com/meet")) return "google_meet";
  if (u.includes("teams.microsoft.com") || u.includes("teams.live.com")) return "teams";
  if (u.includes("zoom.us") || u.includes("zoom.com")) return "zoom";
  return "other";
}

export function meetingProviderLabelKey(
  provider: MeetingProvider | null,
): "dashboard.meetingProviderMeet" | "dashboard.meetingProviderTeams" | "dashboard.meetingProviderZoom" | "dashboard.meetingProviderOther" | null {
  if (!provider) return null;
  if (provider === "google_meet") return "dashboard.meetingProviderMeet";
  if (provider === "teams") return "dashboard.meetingProviderTeams";
  if (provider === "zoom") return "dashboard.meetingProviderZoom";
  return "dashboard.meetingProviderOther";
}
