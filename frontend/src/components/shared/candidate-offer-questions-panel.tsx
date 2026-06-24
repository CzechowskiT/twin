"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { OfferQuestionItem } from "@/lib/offer-readiness";
import type { TranslationKey } from "@/lib/i18n";

export const CANDIDATE_OFFER_QUESTIONS_MARKER = "candidate-offer-questions-panel";

type Props = {
  questions: readonly OfferQuestionItem[];
  testId?: string;
};

function statusLabelKey(status: OfferQuestionItem["status"]): TranslationKey {
  const map: Record<OfferQuestionItem["status"], TranslationKey> = {
    open: "candidateOfferReadiness.questionOpen",
    answered_preview: "candidateOfferReadiness.questionAnsweredPreview",
    blocked: "candidateOfferReadiness.questionBlocked",
  };
  return map[status];
}

export function CandidateOfferQuestionsPanel({ questions, testId }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={testId ?? CANDIDATE_OFFER_QUESTIONS_MARKER}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("candidateOfferReadiness.questionsTitle")}
      </h2>
      <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("candidateOfferReadiness.questionsLead")}</p>
      <ul className="mt-4 space-y-3">
        {questions.map((q) => (
          <li key={q.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{t(q.question_key)}</span>
              <span className="rounded-full border px-2 py-0.5 uppercase text-[var(--twin-accent)]">
                {t(statusLabelKey(q.status))}
              </span>
            </div>
            <p className="mt-1 text-[var(--twin-muted)]">{t(q.context_key)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled className="twin-btn twin-btn-secondary opacity-50">
          {t("candidateOfferReadiness.questionSendDisabled")}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("candidateOfferReadiness.questionsNote")}</p>
    </Card>
  );
}
