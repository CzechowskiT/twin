/**
 * Product surface visibility — honest activation statuses, full module inventory.
 * Supersedes WORKSPACE_GREEN_ONLY_MODE (founder decision 2026-07-10).
 */
import {
  activationStatusToBadgeStatus,
  getWorkspaceModuleActivationStatusForPersona,
  isWorkspaceModuleVisibleForPersona,
  splitByActivationHubSection,
  type ActivationHubSlice,
} from "@/lib/all-workspace-modules-activation";
import { isModuleHiddenFromPilot } from "@/lib/customer-usable-readiness";
import type { MarketingPersona } from "@/lib/marketing-persona";
import type { SystemOfRecordRouteEntry } from "@/lib/system-of-record-routes";
import type { WorkspaceModuleDef, WorkspaceModuleStatus } from "@/lib/workspace-module-status";

export type ProductSurfaceTier = "LIVE" | "PILOT" | "PREVIEW" | "COMING_SOON" | "PAUSED" | "INTERNAL";

/** @deprecated Use ActivationHubSlice — kept for guard compatibility. */
export type ProductSurfaceHubSlice<T> = {
  primary: readonly T[];
  roadmap: readonly T[];
  hidden: readonly T[];
};

/** Public marketing routes that stay reachable regardless of pilot surface. */
export const PUBLIC_SURFACE_HREFS = [
  "/",
  "/demo",
  "/waitlist",
  "/for-candidates",
  "/for-companies",
  "/for-recruiters",
  "/faq",
  "/privacy",
  "/terms",
  "/status",
] as const;

const BOARD_OR_ADMIN_PREFIXES = ["/board/", "/admin/"] as const;

/** Founder-scoped primary nav limits — see FOUNDER_LAUNCH_SCOPE_DECISION_2026-07-08.md */
export const CONTROLLED_PILOT_PRIMARY_LIMITS: Readonly<Record<MarketingPersona, number>> = {
  candidate: 8,
  recruiter: 5,
  company: 4,
  investor: 99,
};

/** Full product surface — no green-only primary cap (WORKSPACE_GREEN_ONLY_MODE=false). */
export const FULL_SURFACE_PRIMARY_LIMITS: Readonly<Record<MarketingPersona, number>> = {
  candidate: 99,
  recruiter: 99,
  company: 99,
  investor: 99,
};

function hrefIsBoardOrAdmin(href: string): boolean {
  return BOARD_OR_ADMIN_PREFIXES.some((prefix) => href.startsWith(prefix));
}

function isInternalModule(persona: MarketingPersona, moduleId: string, href?: string): boolean {
  if (!isWorkspaceModuleVisibleForPersona(persona, moduleId)) return true;
  if (href && hrefIsBoardOrAdmin(href) && persona !== "investor") return true;
  return getWorkspaceModuleActivationStatusForPersona(persona, moduleId) === "INTERNAL";
}

export function classifyProductSurfaceTier(
  persona: MarketingPersona,
  moduleId: string,
  _status?: WorkspaceModuleStatus,
): ProductSurfaceTier {
  if (isInternalModule(persona, moduleId)) return "INTERNAL";
  return getWorkspaceModuleActivationStatusForPersona(persona, moduleId);
}

export function shouldHideFromDefaultHub(persona: MarketingPersona, moduleId: string): boolean {
  if (isInternalModule(persona, moduleId)) return true;
  if (isModuleHiddenFromPilot(moduleId)) return true;
  if (moduleId === "team" || moduleId === "company_team") return isModuleHiddenFromPilot("company_team");
  if (moduleId === "auto_apply" || moduleId.includes("auto-apply") || moduleId.includes("auto_apply")) {
    return isModuleHiddenFromPilot("auto_apply");
  }
  return false;
}

export function shouldShowAsRoadmap(persona: MarketingPersona, moduleId: string): boolean {
  if (shouldHideFromDefaultHub(persona, moduleId)) return false;
  const tier = classifyProductSurfaceTier(persona, moduleId);
  return tier === "PILOT" || tier === "PREVIEW" || tier === "COMING_SOON" || tier === "PAUSED";
}

export function isVisibleInControlledPilot(persona: MarketingPersona, moduleId: string): boolean {
  return !shouldHideFromDefaultHub(persona, moduleId);
}

export function isVisibleInPublicSurface(href: string): boolean {
  const base = href.split("#")[0]?.split("?")[0] ?? "/";
  if ((PUBLIC_SURFACE_HREFS as readonly string[]).includes(base)) return true;
  if (base.startsWith("/for-")) return true;
  return false;
}

/** Legacy slice — maps activation sections to primary/roadmap/hidden for guards. */
export function splitProductSurfaceRoutes(
  persona: MarketingPersona,
  routes: readonly SystemOfRecordRouteEntry[],
): ProductSurfaceHubSlice<SystemOfRecordRouteEntry> {
  const slice = splitActivationSurfaceRoutes(persona, routes);
  return {
    primary: [...slice.core, ...slice.extended],
    roadmap: [...slice.pilotPreview, ...slice.comingSoonPaused],
    hidden: slice.internal,
  };
}

export function splitWorkspaceModules(
  persona: MarketingPersona,
  modules: readonly WorkspaceModuleDef[],
): ProductSurfaceHubSlice<WorkspaceModuleDef> {
  const slice = splitActivationWorkspaceModules(persona, modules);
  return {
    primary: [...slice.core, ...slice.extended],
    roadmap: [...slice.pilotPreview, ...slice.comingSoonPaused],
    hidden: slice.internal,
  };
}

export function splitActivationSurfaceRoutes(
  persona: MarketingPersona,
  routes: readonly SystemOfRecordRouteEntry[],
): ActivationHubSlice<SystemOfRecordRouteEntry> {
  const visible = routes.filter(
    (route) => !isInternalModule(persona, route.id, route.href),
  );
  const forcedInternal = routes.filter((route) =>
    isInternalModule(persona, route.id, route.href),
  );
  const slice = splitByActivationHubSection(visible, persona);
  return {
    ...slice,
    internal: [...slice.internal, ...forcedInternal],
  };
}

export function splitActivationWorkspaceModules(
  persona: MarketingPersona,
  modules: readonly WorkspaceModuleDef[],
): ActivationHubSlice<WorkspaceModuleDef> {
  const visible = modules.filter((mod) => !isInternalModule(persona, mod.id, mod.href));
  const forcedInternal = modules.filter((mod) => isInternalModule(persona, mod.id, mod.href));
  const slice = splitByActivationHubSection(visible, persona);
  return {
    ...slice,
    internal: [...slice.internal, ...forcedInternal],
  };
}

export function tierFromWorkspaceStatus(status: WorkspaceModuleStatus): ProductSurfaceTier {
  const badge = activationStatusToBadgeStatus(
    status === "live"
      ? "LIVE"
      : status === "pilot"
        ? "PILOT"
        : status === "preview"
          ? "PREVIEW"
          : status === "coming_soon" || status === "planned" || status === "needs_setup"
            ? "COMING_SOON"
            : status === "paused" || status === "not_live"
              ? "PAUSED"
              : "PILOT",
  );
  return badge === "live"
    ? "LIVE"
    : badge === "pilot"
      ? "PILOT"
      : badge === "preview"
        ? "PREVIEW"
        : badge === "coming_soon"
          ? "COMING_SOON"
          : badge === "paused"
            ? "PAUSED"
            : "INTERNAL";
}

/** Full product surface — green-only mode is off. */
export function getWorkspacePrimaryLimits(): Readonly<Record<MarketingPersona, number>> {
  return FULL_SURFACE_PRIMARY_LIMITS;
}
