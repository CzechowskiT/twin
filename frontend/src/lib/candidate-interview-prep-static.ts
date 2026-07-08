import type { TranslationKey } from "@/lib/i18n";

/** Static interview prep framework — always visible; not a live coaching promise. */
export const INTERVIEW_PREP_STATIC_MOCK_QUESTION_KEYS = [
  "candidateInterviewPrep.staticMockQ1",
  "candidateInterviewPrep.staticMockQ2",
  "candidateInterviewPrep.staticMockQ3",
  "candidateInterviewPrep.staticMockQ4",
] as const satisfies readonly TranslationKey[];

export const INTERVIEW_PREP_STATIC_CHECKLIST_KEYS = [
  "candidateInterviewPrep.staticCheck1",
  "candidateInterviewPrep.staticCheck2",
  "candidateInterviewPrep.staticCheck3",
  "candidateInterviewPrep.staticCheck4",
  "candidateInterviewPrep.staticCheck5",
] as const satisfies readonly TranslationKey[];

export const INTERVIEW_PREP_STATIC_PLAN_KEYS = [
  "candidateInterviewPrep.staticPlan1",
  "candidateInterviewPrep.staticPlan2",
  "candidateInterviewPrep.staticPlan3",
] as const satisfies readonly TranslationKey[];
