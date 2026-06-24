"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { MicrosoftBusyReadStagingStatusBanner } from "@/components/shared/microsoft-busy-read-staging-status-banner";
import { CANDIDATE_CALENDAR_READINESS_ROUTE } from "@/lib/candidate-calendar-readiness";
import {
  MICROSOFT_CALENDAR_READINESS_MARKERS,
  microsoftBusyReadStageKey,
  resolveMicrosoftCalendarReadiness,
} from "@/lib/microsoft-calendar-readiness";

export const OFFER_CALENDAR_READINESS_CARD_MARKER = "offer-calendar-readiness-card";

type Props = {
  candidateId?: string;
};

export function OfferCalendarReadinessCard({ candidateId }: Props): ReactNode {
  const { t } = useTranslation();
  const record = resolveMicrosoftCalendarReadiness(candidateId);
  if (!record) return null;

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={OFFER_CALENDAR_READINESS_CARD_MARKER}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("microsoftCalendarReadiness.offerCardTitle")}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
        <MicrosoftBusyReadStagingStatusBanner compact />
        <p className="text-[var(--twin-muted-strong)]">{t("microsoftCalendarReadiness.offerCardLead")}</p>
        <p className="font-medium" data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.busyRead}>
          {t(microsoftBusyReadStageKey(record.busy_read_stage))}
        </p>
        <p className="text-xs text-[var(--twin-muted)]">
          {t("microsoftCalendarReadiness.oauthStatusTitle")}: {record.oauth_status} · busy {record.busy_read}
        </p>
        <Link
          href={CANDIDATE_CALENDAR_READINESS_ROUTE}
          className="twin-link inline-block text-xs font-medium"
        >
          {t("microsoftCalendarReadiness.offerCardCta")} →
        </Link>
      </div>
    </Card>
  );
}
