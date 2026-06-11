import {
  recruiterInboxMatchScoreCardClass,
  recruiterInboxMatchScoreLabelClass,
  recruiterInboxMatchScoreToneClass,
  recruiterInboxMatchScoreValueClass,
  type RecruiterInboxMatchScoreTone,
} from "@/lib/recruiter-inbox-visual";

type Props = {
  label: string;
  score: number;
  toneLabel: string;
  tone: RecruiterInboxMatchScoreTone;
};

export function RecruiterMatchScoreCard({ label, score, toneLabel, tone }: Props) {
  return (
    <div className={recruiterInboxMatchScoreCardClass(tone)}>
      <p className={recruiterInboxMatchScoreLabelClass()}>{label}</p>
      <p className={recruiterInboxMatchScoreValueClass()}>{Math.round(score)}%</p>
      <p className={recruiterInboxMatchScoreToneClass(tone)}>{toneLabel}</p>
    </div>
  );
}
