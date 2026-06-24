"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { CANDIDATE_CALENDAR_READINESS_ROUTE } from "@/lib/candidate-calendar-readiness";
import {
  MICROSOFT_BUSY_READ_MARKERS,
} from "@/lib/microsoft-busy-read";
import { useMicrosoftBusyReadLive } from "@/lib/use-microsoft-busy-read-live";
import type { TranslationKey } from "@/lib/i18n";

export const MICROSOFT_BUSY_READ_CROSS_LINK_MARKER = MICROSOFT_BUSY_READ_MARKERS.crossLink;

export type MicrosoftBusyReadCrossLinkContext = "offer" | "placement" | "board";

type Props = {
  context: MicrosoftBusyReadCrossLinkContext;
  candidateId?: string;
};

const CONTEXT_RELATED_KEYS: Record<MicrosoftBusyReadCrossLinkContext, TranslationKey> = {
  offer: "microsoftBusyRead.relatedToOfferReadiness",
  placement: "microsoftBusyRead.relatedToPlacementEvidence",
  board: "microsoftBusyRead.relatedToBoardEvidence",
};

export function MicrosoftBusyReadCrossLinkCard({ context, candidateId }: Props): ReactNode {
  const { t } = useTranslation();
  const { record } = useMicrosoftBusyReadLive(candidateId);
  if (!record) return null;

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={MICROSOFT_BUSY_READ_CROSS_LINK_MARKER}
      data-cross-link-context={context}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("microsoftBusyRead.crossLinkTitle")}
      </h2>
      <div className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
        <p className="text-[var(--twin-muted-strong)]">{t("microsoftBusyRead.crossLinkLead")}</p>
        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.readOnlyAvailabilityProof")}</p>
        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.noInviteSent")}</p>
        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.noEventWrite")}</p>
        <p className="text-xs font-medium text-[var(--twin-muted-strong)]">{t(CONTEXT_RELATED_KEYS[context])}</p>
        <Link
          href={CANDIDATE_CALENDAR_READINESS_ROUTE}
          className="twin-link inline-block text-xs font-medium"
        >
          {t("microsoftBusyRead.crossLinkCta")} →
        </Link>
      </div>
    </Card>
  );
}
