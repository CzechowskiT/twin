"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  MICROSOFT_BUSY_READ_MARKERS,
  microsoftBusyReadLiveEnabled,
} from "@/lib/microsoft-busy-read";

type Props = {
  compact?: boolean;
};

/** Staging-only honest status — shown when live busy-read product gate is off. */
export function MicrosoftBusyReadStagingStatusBanner({ compact = false }: Props): ReactNode {
  const { t } = useTranslation();
  const liveEnabled = microsoftBusyReadLiveEnabled();

  if (liveEnabled) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-[var(--twin-muted-strong)]"
          : "rounded border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-[var(--twin-muted-strong)]"
      }
      data-testid={MICROSOFT_BUSY_READ_MARKERS.stagingStatus}
      role="status"
    >
      <p className="font-medium text-[var(--foreground)]">{t("microsoftBusyRead.stagingStatusTitle")}</p>
      <p className="mt-1">{t("microsoftBusyRead.stagingStatusLead")}</p>
      {!compact ? (
        <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.stagingStatusGatesOff")}</p>
      ) : null}
    </div>
  );
}
