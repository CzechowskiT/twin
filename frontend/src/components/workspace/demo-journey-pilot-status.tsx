"use client";

import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import {
  DEMO_JOURNEY_DEFAULT_STATUS,
  UNIFIED_DEMO_JOURNEY_COPY,
} from "@/lib/product-polish-p3";
import type { TranslationKey } from "@/lib/i18n";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

type DemoJourneyPilotStatusProps = {
  status?: WorkspaceModuleStatus;
  labelKey?: TranslationKey;
  testId?: string;
  showLead?: boolean;
  className?: string;
};

/** One status badge + optional unified demo journey lead — replaces inline pilot chips. */
export function DemoJourneyPilotStatus({
  status = DEMO_JOURNEY_DEFAULT_STATUS,
  labelKey,
  testId,
  showLead = UNIFIED_DEMO_JOURNEY_COPY,
  className,
}: DemoJourneyPilotStatusProps) {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col items-end gap-1 ${className ?? ""}`}>
      <WorkspaceStatusBadge status={status} labelKey={labelKey} testId={testId} />
      {showLead ? (
        <p className="max-w-[14rem] text-right text-[10px] leading-snug text-[var(--twin-muted-strong)]">
          {t("productPolish.demoJourneyLead")}
        </p>
      ) : null}
    </div>
  );
}
