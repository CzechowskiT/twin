import type { ReactNode } from "react";

import { RecruiterMatchScoreCard } from "@/components/recruiter/recruiter-match-score-card";
import {
  RECRUITER_INBOX_VISUAL_MARKERS,
  recruiterInboxDecisionRailClass,
  recruiterInboxReviewCardCtaClass,
  recruiterInboxStatusBadgeClass,
  type RecruiterInboxMatchScoreTone,
} from "@/lib/recruiter-inbox-visual";

type Props = {
  matchScore?: { label: string; score: number; toneLabel: string; tone: RecruiterInboxMatchScoreTone };
  statusBadge?: { label: string; variant: "awaiting" | "accepted" | "declined" };
  reviewCard?: {
    expanded: boolean;
    openLabel: string;
    closeLabel: string;
    onToggle: () => void;
  };
  actions?: ReactNode;
};

export function RecruiterDecisionRail({ matchScore, statusBadge, reviewCard, actions }: Props) {
  return (
    <div className={`${recruiterInboxDecisionRailClass()} ${RECRUITER_INBOX_VISUAL_MARKERS.actionZone}`}>
      {matchScore ? (
        <RecruiterMatchScoreCard
          label={matchScore.label}
          score={matchScore.score}
          toneLabel={matchScore.toneLabel}
          tone={matchScore.tone}
        />
      ) : null}
      {statusBadge ? (
        <span className={`${recruiterInboxStatusBadgeClass(statusBadge.variant)} w-full justify-center`}>
          {statusBadge.label}
        </span>
      ) : null}
      {reviewCard ? (
        <button
          type="button"
          className={recruiterInboxReviewCardCtaClass()}
          aria-expanded={reviewCard.expanded}
          onClick={reviewCard.onToggle}
        >
          <span>{reviewCard.expanded ? reviewCard.closeLabel : reviewCard.openLabel}</span>
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${reviewCard.expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      {actions}
    </div>
  );
}
