"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import type { OfferComparisonRow } from "@/lib/offer-readiness";

export const OFFER_COMPARISON_PREVIEW_MARKER = "offer-comparison-preview";

type Props = {
  rows: readonly OfferComparisonRow[];
  testId?: string;
};

export function OfferComparisonPreview({ rows, testId }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid={testId ?? OFFER_COMPARISON_PREVIEW_MARKER}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("candidateOfferReadiness.comparisonTitle")}
      </h2>
      <p className="mt-2 text-xs text-[var(--twin-accent)]">{t("candidateOfferReadiness.comparisonDisclaimer")}</p>
      <p className="mt-1 text-xs text-[var(--twin-muted-strong)]">{t("candidateOfferReadiness.comparisonLead")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--twin-border)]/60 text-[var(--twin-muted)]">
              <th className="py-1 pr-2">{t("candidateOfferReadiness.compColLabel")}</th>
              <th className="py-1 pr-2">{t("candidateOfferReadiness.compColCurrent")}</th>
              <th className="py-1 pr-2">{t("candidateOfferReadiness.compColEstimated")}</th>
              <th className="py-1">{t("candidateOfferReadiness.compColNote")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--twin-border)]/40">
                <td className="py-2 pr-2 font-medium">{t(row.label_key)}</td>
                <td className="py-2 pr-2 text-[var(--twin-muted-strong)]">{row.current_value}</td>
                <td className="py-2 pr-2 text-[var(--twin-muted-strong)]">{row.estimated_value}</td>
                <td className="py-2 text-[var(--twin-muted)]">{t(row.note_key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
