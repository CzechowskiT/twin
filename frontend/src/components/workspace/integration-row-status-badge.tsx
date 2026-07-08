"use client";

import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";
import { NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON } from "@/lib/seven-day-d6-integrations";

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
  let mapped = INTEGRATION_STATUS_MAP[status] ?? "not_live";
  if (NORMALIZE_INTEGRATION_NOT_LIVE_AS_COMING_SOON && mapped === "not_live") {
    mapped = "coming_soon";
  }
  return <WorkspaceStatusBadge status={mapped} testId={testId} />;
}
