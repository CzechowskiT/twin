"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { EvidenceStatusBadge } from "@/components/shared/evidence-status-badge";
import { Card } from "@/components/ui";
import { offerReadinessSourceKey, type OfferReadinessRecord } from "@/lib/offer-readiness";
import type { TranslationKey } from "@/lib/i18n";

export const OFFER_READINESS_STATUS_BADGE_MARKER = "offer-readiness-status-badge";

type Props = {
  status: OfferReadinessRecord["readiness_status"];
  source: OfferReadinessRecord["source"];
};

function statusLabelKey(status: OfferReadinessRecord["readiness_status"]): TranslationKey {
  const map: Record<OfferReadinessRecord["readiness_status"], TranslationKey> = {
    not_started: "candidateOfferReadiness.statusNotStarted",
    gathering: "candidateOfferReadiness.statusGathering",
    preview_ready: "candidateOfferReadiness.statusPreviewReady",
    human_review: "candidateOfferReadiness.statusHumanReview",
    blocked: "candidateOfferReadiness.statusBlocked",
  };
  return map[status];
}

export function OfferReadinessStatusBadge({ status, source }: Props): ReactNode {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className="inline-block rounded-full border px-3 py-1 text-xs font-medium"
        data-testid={OFFER_READINESS_STATUS_BADGE_MARKER}
      >
        {t(statusLabelKey(status))}
      </span>
      <EvidenceStatusBadge source={source} testId="offer-readiness-source-badge" />
    </div>
  );
}

export function OfferReadinessPanel({ record }: { record: OfferReadinessRecord }): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5 sm:p-6" data-testid="offer-readiness-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
            {t("candidateOfferReadiness.summaryTitle")}
          </h2>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateOfferReadiness.summaryLead")}</p>
          <p className="text-sm font-medium">{record.headline}</p>
          <p className="text-xs text-[var(--twin-muted)]">
            {record.role_title} · {record.company_label}
          </p>
          <p className="font-mono text-[10px] text-[var(--twin-muted)]">
            {record.candidate_id} · {record.role_id}
          </p>
        </div>
        <OfferReadinessStatusBadge status={record.readiness_status} source={record.source} />
      </div>
      <p className="mt-3 text-xs text-[var(--twin-muted)]">{t(offerReadinessSourceKey(record.source))}</p>
    </Card>
  );
}
