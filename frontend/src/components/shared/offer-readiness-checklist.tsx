"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { OfferReadinessChecklistItem } from "@/lib/offer-readiness";
import type { TranslationKey } from "@/lib/i18n";

export const OFFER_READINESS_CHECKLIST_MARKER = "offer-readiness-checklist";

type Props = {
  items: readonly OfferReadinessChecklistItem[];
  testId?: string;
};

function statusLabelKey(status: OfferReadinessChecklistItem["status"]): TranslationKey {
  const map: Record<OfferReadinessChecklistItem["status"], TranslationKey> = {
    done: "candidateOfferReadiness.checklistDone",
    pending: "candidateOfferReadiness.checklistPending",
    blocked: "candidateOfferReadiness.checklistBlocked",
    not_applicable: "candidateOfferReadiness.checklistNotApplicable",
  };
  return map[status];
}

export function OfferReadinessChecklist({ items, testId }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={testId ?? OFFER_READINESS_CHECKLIST_MARKER}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("candidateOfferReadiness.checklistTitle")}
      </h2>
      <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("candidateOfferReadiness.checklistLead")}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {index + 1}. {t(item.section_key)}
              </span>
              <span className="rounded-full border px-2 py-0.5 uppercase text-[var(--twin-accent)]">
                {t(statusLabelKey(item.status))}
              </span>
            </div>
            <p className="mt-1 text-[var(--twin-muted)]">{t(item.detail_key)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
