export const RECRUITER_TALENT_RADAR_DIGEST_ROUTE = "/recruiter/talent-radar/digest";

export const RECRUITER_TALENT_RADAR_DIGEST_MARKERS = {
  page: "recruiter-talent-radar-digest-page",
  hero: "recruiter-talent-radar-digest-hero",
  statusChips: "recruiter-talent-radar-digest-status-chips",
  summaryPanel: "recruiter-talent-radar-digest-summary",
  narrative: "recruiter-talent-radar-digest-narrative",
  copyButton: "recruiter-talent-radar-digest-copy",
  section: "recruiter-talent-radar-digest-section",
  candidateCard: "recruiter-talent-radar-digest-candidate-card",
  emptyState: "recruiter-talent-radar-digest-empty",
  periodSelector: "recruiter-talent-radar-digest-period",
  warnings: "recruiter-talent-radar-digest-warnings",
} as const;

export const TALENT_RADAR_DIGEST_PERIODS = ["7d", "30d", "week"] as const;
export type TalentRadarDigestPeriod = (typeof TALENT_RADAR_DIGEST_PERIODS)[number];

export type DigestLatestDecision = {
  actionType?: string;
  createdAt?: string;
  reason?: string;
  snoozeUntil?: string;
};

export type DigestCandidate = {
  candidateId: string;
  applicationId?: string;
  jobId?: string;
  displayName: string;
  headline?: string | null;
  roleTitle?: string;
  fitLabel?: string;
  score?: number;
  whyNow?: string[];
  latestDecision?: DigestLatestDecision | null;
  recommendedNextAction: string;
  dataConfidence?: "high" | "medium" | "low";
  status?: string;
};

export type DismissPattern = {
  reasonCode: string;
  label: string;
  count: number;
};

export type LowCoverageRole = {
  jobId: string;
  roleTitle: string;
  candidateCount: number;
  coverageWarning: string;
  recommendedNextAction: string;
};

export type TalentRadarDigestPayload = {
  period?: {
    label: string;
    from: string;
    to: string;
  };
  summary?: {
    candidatesToReview: number;
    returningFromSnooze: number;
    shortlistedWithoutFollowUp: number;
    newRadarDecisions: number;
    lowCoverageRoles: number;
    draftsPreparedNotSent: number;
  };
  sections?: {
    reviewFirst?: DigestCandidate[];
    returningFromSnooze?: DigestCandidate[];
    shortlistedWithoutFollowUp?: DigestCandidate[];
    dismissedPatterns?: DismissPattern[];
    lowCoverageRoles?: LowCoverageRole[];
    draftsPrepared?: DigestCandidate[];
  };
  narrative?: string;
  dataQualityWarnings?: string[];
  generatedAt?: string;
  disclaimer?: string;
  companySlug?: string;
  pilot?: boolean;
  emailSent?: boolean;
  automaticOutreach?: boolean;
};

export function talentRadarDigestQueryParams(
  token: string,
  companySlug: string,
  period: TalentRadarDigestPeriod,
): URLSearchParams {
  return new URLSearchParams({
    company_slug: companySlug.trim(),
    token: token.trim(),
    period,
  });
}

export function buildDigestCopyText(payload: TalentRadarDigestPayload): string {
  const lines: string[] = [];
  const period = payload.period?.label ?? "";
  if (period) lines.push(`Period: ${period}`);
  if (payload.narrative) {
    lines.push("");
    lines.push(payload.narrative);
  }
  const s = payload.summary;
  if (s) {
    lines.push("");
    lines.push(
      `Review: ${s.candidatesToReview} | Snooze returns: ${s.returningFromSnooze} | Shortlist no follow-up: ${s.shortlistedWithoutFollowUp} | Drafts not sent: ${s.draftsPreparedNotSent}`,
    );
  }
  lines.push("");
  lines.push(payload.disclaimer ?? "Recruiter decides — no automatic outreach.");
  return lines.join("\n");
}

export function digestHasContent(payload: TalentRadarDigestPayload): boolean {
  const s = payload.summary;
  if (!s) return false;
  return (
    s.candidatesToReview +
      s.returningFromSnooze +
      s.shortlistedWithoutFollowUp +
      s.newRadarDecisions +
      s.draftsPreparedNotSent >
    0
  );
}
