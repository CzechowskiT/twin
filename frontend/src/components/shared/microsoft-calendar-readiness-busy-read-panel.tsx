"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import {
  MICROSOFT_CALENDAR_READINESS_MARKERS,
  microsoftBusyReadStageKey,
  type MicrosoftCalendarReadinessRecord,
} from "@/lib/microsoft-calendar-readiness";

type Props = {
  record: MicrosoftCalendarReadinessRecord;
};

export function MicrosoftCalendarReadinessBusyReadPanel({ record }: Props): ReactNode {
  const { t } = useTranslation();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.busyRead}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("microsoftCalendarReadiness.busyReadTitle")}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
        <p className="text-[var(--twin-muted-strong)]">{t("microsoftCalendarReadiness.busyReadLead")}</p>
        <p className="font-medium">{t(microsoftBusyReadStageKey(record.busy_read_stage))}</p>

        <div data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.oauthStatus}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftCalendarReadiness.oauthStatusTitle")}</p>
          <p className="font-medium">{record.oauth_status}</p>
        </div>

        <div data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.publicHealth}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftCalendarReadiness.publicHealthTitle")}</p>
          <p className="font-medium">{record.public_health_flag ? "true" : "false"}</p>
        </div>

        <div data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.scopes}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftCalendarReadiness.scopesTitle")}</p>
          <p className="font-mono text-xs">{record.scopes_preview.join(" · ")}</p>
        </div>

        <div data-testid={MICROSOFT_CALENDAR_READINESS_MARKERS.blocked}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftCalendarReadiness.blockedTitle")}</p>
          <ul className="mt-2 space-y-2">
            {record.blocked_capabilities.map((cap) => (
              <li key={cap.id} className="rounded border border-[var(--twin-border)]/60 p-3 text-xs">
                <span className="font-medium">{cap.label}</span>
                <p className="mt-1 text-[var(--twin-muted)]">{cap.reason}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftCalendarReadiness.boundaryNote")}</p>
      </div>
    </Card>
  );
}
