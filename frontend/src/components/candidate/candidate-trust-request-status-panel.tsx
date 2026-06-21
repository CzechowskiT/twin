"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  CANDIDATE_TRUST_REQUEST_STATUS_MARKERS,
  type TrustRequestStatus,
} from "@/lib/candidate-trust-request-status";

type Props = {
  status: TrustRequestStatus | null;
};

export function CandidateTrustRequestStatusPanel({ status }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.panel}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">
          {t("liveOperatingState.trustRequestStatusTitle")}
        </h2>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("liveOperatingState.trustRequestStatusLead")}</p>
        <p className="mt-2 text-xs text-[var(--twin-muted)]" data-testid={CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.sourceBadge}>
          {status ? t(status.sourceKey) : t("liveOperatingState.loading")}
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div data-testid={CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.exportCount}>
            <dt className="text-[10px] uppercase text-[var(--twin-muted)]">{t("candidateTrustOverview.downloadAuditExport")}</dt>
            <dd className="text-lg font-semibold">{status?.exportCount ?? "—"}</dd>
          </div>
          <div data-testid={CANDIDATE_TRUST_REQUEST_STATUS_MARKERS.intakeCount}>
            <dt className="text-[10px] uppercase text-[var(--twin-muted)]">{t("requestIntake.countLabel")}</dt>
            <dd className="text-lg font-semibold">{status?.intakeCount ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
