"use client";

import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

const INTEGRATION_STATUS_MAP: Record<string, WorkspaceModuleStatus> = {
  live: "live",
  pilot: "pilot",
  preview: "preview",
  planned: "planned",
  coming_soon: "coming_soon",
  not_live: "not_live",
  paused: "paused",
};

type IntegrationRowStatusBadgeProps = {
  status: string;
  testId?: string;
};

export function IntegrationRowStatusBadge({ status, testId }: IntegrationRowStatusBadgeProps) {
  const mapped = INTEGRATION_STATUS_MAP[status] ?? "not_live";
  return <WorkspaceStatusBadge status={mapped} testId={testId} />;
}
