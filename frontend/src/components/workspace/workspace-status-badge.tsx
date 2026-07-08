"use client";

import { useTranslation } from "@/components/language-provider";
import {
  WORKSPACE_STATUS_LABEL_KEYS,
  type WorkspaceModuleStatus,
} from "@/lib/workspace-module-status";

const TONE: Record<WorkspaceModuleStatus, string> = {
  live: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  pilot: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  planned: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  coming_soon: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  not_live: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  needs_setup: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  paused: "border-violet-500/40 bg-violet-500/10 text-violet-200",
};

type WorkspaceStatusBadgeProps = {
  status: WorkspaceModuleStatus;
  testId?: string;
  className?: string;
};

export function WorkspaceStatusBadge({ status, testId, className }: WorkspaceStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE[status]} ${className ?? ""}`}
      data-workspace-status={status}
      data-testid={testId}
    >
      {t(WORKSPACE_STATUS_LABEL_KEYS[status])}
    </span>
  );
}
