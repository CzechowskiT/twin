"use client";

import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import { useTranslation } from "@/components/language-provider";
import { ACTIONABLE_EMPTY_STATES } from "@/lib/actionable-empty-states";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Props = {
  areaId: keyof typeof ACTIONABLE_EMPTY_STATES;
  /** When false, render nothing (caller shows data). Loading/error handled by parent. */
  show: boolean;
  isLoading?: boolean;
  isError?: boolean;
};

/** Actionable empty for IA areas — never treats loading/error as empty. */
export function IaActionableEmpty({ areaId, show, isLoading, isError }: Props) {
  const { t } = useTranslation();
  const cfg = ACTIONABLE_EMPTY_STATES[areaId];
  if (!cfg) return null;
  if (isLoading || isError || !show) return null;

  const steps = cfg.stepKeys.map((k) => t(k));

  return (
    <GuidedEmptyState
      title={t(cfg.titleKey)}
      message={t(cfg.messageKey)}
      steps={steps}
      actionLabel={t(cfg.ctaKey)}
      actionHref={cfg.href}
      onAction={() => {
        const token = getToken();
        if (!token) return;
        void apiFetch(
          "/api/v1/candidates/me/pilot-consolidation/telemetry",
          {
            method: "POST",
            body: JSON.stringify({
              event_name: "actionable_empty_cta",
              properties: { area: areaId, kpi_excluded: true },
            }),
          },
          token
        ).catch(() => undefined);
      }}
    />
  );
}
