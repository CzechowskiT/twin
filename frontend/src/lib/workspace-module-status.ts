/** Honest readiness tiers for persona workspace module cards. */

import type { TranslationKey } from "@/lib/i18n";

export type WorkspaceModuleStatus =
  | "live"
  | "pilot"
  | "planned"
  | "coming_soon"
  | "not_live"
  | "needs_setup"
  | "paused";

export const WORKSPACE_STATUS_LABEL_KEYS: Record<
  WorkspaceModuleStatus,
  TranslationKey
> = {
  live: "workspaceModules.statusLive",
  pilot: "workspaceModules.statusPilot",
  planned: "workspaceModules.statusPlanned",
  coming_soon: "workspaceModules.statusComingSoon",
  not_live: "workspaceModules.statusNotLive",
  needs_setup: "workspaceModules.statusNeedsSetup",
  paused: "workspaceModules.statusPaused",
};

export type WorkspaceModuleDef = {
  id: string;
  href: string;
  titleKey: TranslationKey;
  valuePropKey: TranslationKey;
  hintKey?: TranslationKey;
  ctaKey: TranslationKey;
  status: WorkspaceModuleStatus;
  anchor?: string;
};
