/**
 * Product Polish 1.0 P3 — demo journey badge migration and investor invite-only copy.
 */
import type { WorkspaceModuleStatus } from "@/lib/workspace-module-status";

/** Demo journey submodule pages use WorkspaceStatusBadge instead of inline chips. */
export const DEMO_JOURNEY_BADGE_MIGRATION = true;

/** Default tier for sample / demo journey workspaces. */
export const DEMO_JOURNEY_DEFAULT_STATUS: WorkspaceModuleStatus = "preview";

/** Unified demo journey banner copy on pilot submodule pages. */
export const UNIFIED_DEMO_JOURNEY_COPY = true;

/** Investor login shows invite-only preview — not “needs setup”. */
export const INVESTOR_LOGIN_INVITE_ONLY_PREVIEW = true;
