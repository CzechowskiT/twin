"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import {
  MICROSOFT_BUSY_READ_MARKERS,
  microsoftBusyReadSourceKey,
  type MicrosoftBusyReadCapabilityRecord,
} from "@/lib/microsoft-busy-read";

type Props = {
  record: MicrosoftBusyReadCapabilityRecord;
  compact?: boolean;
};

export function MicrosoftBusySlotPreviewPanel({ record, compact = false }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={MICROSOFT_BUSY_READ_MARKERS.slotPreview}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("microsoftBusyRead.slotPreviewTitle")}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
        <p className="text-[var(--twin-muted-strong)]">{t("microsoftBusyRead.slotPreviewLead")}</p>
        <p className="text-xs text-[var(--twin-muted)]">
          {t("microsoftBusyRead.providerLabel")}: Microsoft · {t("microsoftBusyRead.scopeLabel")}: Calendars.Read
        </p>

        <ul className="space-y-2" data-testid={`${MICROSOFT_BUSY_READ_MARKERS.slotPreview}-list`}>
          {record.busy_slot_preview.map((slot) => (
            <li
              key={`${slot.start}-${slot.end}`}
              className="rounded border border-[var(--twin-border)]/60 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono">
                  {slot.start} → {slot.end}
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                  {slot.status}
                </span>
              </div>
              <p className="mt-1 text-[var(--twin-muted)]">{t("microsoftBusyRead.eventDetailsRedacted")}</p>
              <p className="mt-1 text-[10px] text-[var(--twin-muted)]">
                {t(microsoftBusyReadSourceKey(slot.source))}
              </p>
            </li>
          ))}
        </ul>

        {!compact ? (
          <>
            <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.noEventWrite")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.noInviteSent")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.noCalendarSync")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.productGateRequired")}</p>
          </>
        ) : null}

        <Button
          type="button"
          className="twin-btn-secondary twin-touch-target !w-auto self-start"
          disabled
          data-testid={MICROSOFT_BUSY_READ_MARKERS.liveDisabled}
        >
          {t("microsoftBusyRead.liveBusyReadDisabled")}
        </Button>
      </div>
    </Card>
  );
}
