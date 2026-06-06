/** Recruiter inbox row decision state — drives button visibility and status badges. */

export function normalizeRecruiterInboxStatus(status: string): string {
  return status.trim().toLowerCase();
}

/** Rows awaiting recruiter accept/decline. */
export function isRecruiterInboxActionable(status: string): boolean {
  const s = normalizeRecruiterInboxStatus(status);
  return s === "applied" || s === "pending";
}

export type RecruiterInboxDecisionBadge = "accepted" | "declined";

export function recruiterInboxDecisionBadge(status: string): RecruiterInboxDecisionBadge | null {
  const s = normalizeRecruiterInboxStatus(status);
  if (s === "interview") return "accepted";
  if (s === "rejected") return "declined";
  return null;
}

/** Applied filter shows only rows still awaiting decision. */
export function recruiterInboxMatchesStatusFilter(
  status: string,
  filter: "all" | "applied" | "interview",
): boolean {
  if (filter === "all") return true;
  if (filter === "applied") return isRecruiterInboxActionable(status);
  return normalizeRecruiterInboxStatus(status) === filter;
}
