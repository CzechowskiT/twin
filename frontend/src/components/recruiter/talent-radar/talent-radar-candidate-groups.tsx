"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import type { TalentRadarCandidate } from "@/lib/recruiter-talent-radar";
import {
  groupTalentRadarCandidates,
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarReviewGroupOrder,
  type TalentRadarReviewGroup,
} from "@/lib/recruiter-talent-radar-visual";

import { TalentRadarCandidateCard } from "./talent-radar-candidate-card";

function groupTitleKey(group: TalentRadarReviewGroup): TranslationKey {
  const map: Record<TalentRadarReviewGroup, TranslationKey> = {
    review_first: "recruiterTalentRadar.groupReviewFirst",
    possible_match: "recruiterTalentRadar.groupPossibleMatch",
    needs_verification: "recruiterTalentRadar.groupNeedsVerification",
    low_confidence: "recruiterTalentRadar.groupLowConfidence",
  };
  return map[group];
}

function groupHintKey(group: TalentRadarReviewGroup): TranslationKey {
  const map: Record<TalentRadarReviewGroup, TranslationKey> = {
    review_first: "recruiterTalentRadar.groupReviewFirstHint",
    possible_match: "recruiterTalentRadar.groupPossibleMatchHint",
    needs_verification: "recruiterTalentRadar.groupNeedsVerificationHint",
    low_confidence: "recruiterTalentRadar.groupLowConfidenceHint",
  };
  return map[group];
}

export function TalentRadarCandidateGroups({
  rows,
  roleTitle,
  onDraft,
  onShortlist,
  onDismiss,
  onSnooze,
  onReviewCardOpen,
  preparingDraftAppId,
}: {
  rows: TalentRadarCandidate[];
  roleTitle: string;
  onDraft: (row: TalentRadarCandidate) => void;
  onShortlist: (row: TalentRadarCandidate) => void;
  onDismiss: (row: TalentRadarCandidate) => void;
  onSnooze: (row: TalentRadarCandidate) => void;
  onReviewCardOpen?: (row: TalentRadarCandidate) => void;
  preparingDraftAppId?: number | null;
}) {
  const { t } = useTranslation();
  const buckets = groupTalentRadarCandidates(rows);

  return (
    <div className="space-y-10">
      {talentRadarReviewGroupOrder().map((group) => {
        const groupRows = buckets[group];
        if (!groupRows.length) return null;

        return (
          <section
            key={group}
            data-testid={TALENT_RADAR_VISUAL_MARKERS.candidateGroup}
            data-group={group}
          >
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[var(--foreground)]">{t(groupTitleKey(group))}</h2>
              <p className="twin-muted mt-1 text-xs">{t(groupHintKey(group))}</p>
              <p className="mt-1 text-xs font-medium tabular-nums text-[var(--twin-muted-strong)]">
                {groupRows.length}
              </p>
            </div>
            <ul className="space-y-5">
              {groupRows.map((row) => (
                <li key={row.id}>
                  <TalentRadarCandidateCard
                    row={row}
                    roleTitle={roleTitle}
                    draftPreparing={
                      preparingDraftAppId != null &&
                      preparingDraftAppId === Number(row.application_id ?? row.id)
                    }
                    onDraft={() => onDraft(row)}
                    onShortlist={() => onShortlist(row)}
                    onDismiss={() => onDismiss(row)}
                    onSnooze={() => onSnooze(row)}
                    onReviewCardOpen={onReviewCardOpen ? () => onReviewCardOpen(row) : undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
