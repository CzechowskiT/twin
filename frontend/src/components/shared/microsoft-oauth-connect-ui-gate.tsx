"use client";

import type { ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import {
  MICROSOFT_BUSY_READ_MARKERS,
  microsoftBusyReadConnectDisabled,
  type MicrosoftBusyReadCapabilityRecord,
} from "@/lib/microsoft-busy-read";

type Props = {
  record: MicrosoftBusyReadCapabilityRecord;
};

export function MicrosoftOAuthConnectUiGate({ record }: Props): ReactNode {
  const { t } = useTranslation();
  const connectDisabled = microsoftBusyReadConnectDisabled();

  return (
    <Card
      variant="soft"
      className="border-[var(--twin-border)]/80 p-5 sm:p-6"
      data-testid={MICROSOFT_BUSY_READ_MARKERS.oauthGate}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--twin-muted-strong)]">
        {t("microsoftBusyRead.oauthGateTitle")}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
        <p className="text-[var(--twin-muted-strong)]">{t("microsoftBusyRead.oauthGateLead")}</p>

        <div data-testid={`${MICROSOFT_BUSY_READ_MARKERS.oauthGate}-public-health`}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.publicHealthTitle")}</p>
          <p className="font-medium">
            microsoft_calendar_configured: {record.public_health_microsoft_configured ? "true" : "false"}
          </p>
        </div>

        <div data-testid={`${MICROSOFT_BUSY_READ_MARKERS.oauthGate}-required-scopes`}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.requiredScopesTitle")}</p>
          <p className="font-mono text-xs">{record.required_scopes.join(" · ")}</p>
        </div>

        <div data-testid={`${MICROSOFT_BUSY_READ_MARKERS.oauthGate}-forbidden-scopes`}>
          <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.forbiddenScopesTitle")}</p>
          <p className="font-mono text-xs">{record.forbidden_scopes.join(" · ")}</p>
        </div>

        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.connectNotEnabled")}</p>
        <p className="text-xs text-[var(--twin-muted)]">{t("microsoftBusyRead.readOnlyGateNote")}</p>

        <Button
          type="button"
          className="twin-btn-secondary twin-touch-target !w-auto self-start"
          disabled={connectDisabled}
          aria-disabled={connectDisabled}
          data-testid={`${MICROSOFT_BUSY_READ_MARKERS.oauthGate}-connect`}
        >
          {t("microsoftBusyRead.connectDisabledLabel")}
        </Button>
      </div>
    </Card>
  );
}
