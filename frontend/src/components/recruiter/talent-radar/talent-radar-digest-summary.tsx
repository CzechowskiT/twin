"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { RECRUITER_TALENT_RADAR_DIGEST_MARKERS } from "@/lib/recruiter-talent-radar-digest";

type SummaryKey =
  | "candidatesToReview"
  | "returningFromSnooze"
  | "shortlistedWithoutFollowUp"
  | "newRadarDecisions"
  | "lowCoverageRoles"
  | "draftsPreparedNotSent";

const STAT_CONFIG: { key: SummaryKey; labelKey: TranslationKey; hintKey: TranslationKey }[] = [
  {
    key: "candidatesToReview",
    labelKey: "recruiterTalentRadarDigest.summaryCandidatesToReview",
    hintKey: "recruiterTalentRadarDigest.summaryCandidatesToReviewHint",
  },
  {
    key: "returningFromSnooze",
    labelKey: "recruiterTalentRadarDigest.summaryReturningFromSnooze",
    hintKey: "recruiterTalentRadarDigest.summaryReturningFromSnoozeHint",
  },
  {
    key: "shortlistedWithoutFollowUp",
    labelKey: "recruiterTalentRadarDigest.summaryShortlistNoFollowUp",
    hintKey: "recruiterTalentRadarDigest.summaryShortlistNoFollowUpHint",
  },
  {
    key: "newRadarDecisions",
    labelKey: "recruiterTalentRadarDigest.summaryNewDecisions",
    hintKey: "recruiterTalentRadarDigest.summaryNewDecisionsHint",
  },
  {
    key: "lowCoverageRoles",
    labelKey: "recruiterTalentRadarDigest.summaryLowCoverageRoles",
    hintKey: "recruiterTalentRadarDigest.summaryLowCoverageRolesHint",
  },
  {
    key: "draftsPreparedNotSent",
    labelKey: "recruiterTalentRadarDigest.summaryDraftsNotSent",
    hintKey: "recruiterTalentRadarDigest.summaryDraftsNotSentHint",
  },
];

export function TalentRadarDigestSummary({
  summary,
}: {
  summary: Record<SummaryKey, number>;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      data-testid={RECRUITER_TALENT_RADAR_DIGEST_MARKERS.summaryPanel}
    >
      {STAT_CONFIG.map(({ key, labelKey, hintKey }) => (
        <div
          key={key}
          className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4"
        >
          <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">{summary[key]}</p>
          <p className="mt-0.5 text-xs font-semibold text-[var(--foreground)]">{t(labelKey)}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--twin-muted-strong)]">{t(hintKey)}</p>
        </div>
      ))}
      <p className="sm:col-span-2 lg:col-span-3 text-xs text-[var(--twin-muted-strong)]">
        {t("recruiterTalentRadarDigest.trustNoOutreach")}
      </p>
    </div>
  );
}
