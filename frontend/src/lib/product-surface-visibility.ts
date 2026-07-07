/**
 * Controlled-pilot product surface — default hub visibility without removing routes.
 * Routes and SoR entries stay intact; hubs only change grouping and default display.
 */
import type { MarketingPersona } from "@/lib/marketing-persona";
import type { SystemOfRecordRouteEntry } from "@/lib/system-of-record-routes";
import type { WorkspaceModuleDef, WorkspaceModuleStatus } from "@/lib/workspace-module-status";

export type ProductSurfaceTier = "LIVE" | "PILOT" | "HOLD" | "INTERNAL" | "COMING_SOON";

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

const ALWAYS_HIDDEN_MODULE_IDS = new Set([
  "auto_apply",
  "candidate_revoke_delete",
  "recruiter_calendar",
  "recruiter_operational_work_queue",
  "recruiter_ats_import_readiness",
  "company_billing",
  "company_ats_import_readiness",
]);

const BOARD_OR_ADMIN_PREFIXES = ["/board/", "/admin/"] as const;

const CANDIDATE_PRIMARY_IDS = new Set([
  "candidate_panel",
  "candidate_jobs",
  "candidate_matches",
  "candidate_profile",
  "candidate_cv",
  "candidate_applications",
  "candidate_calendar",
  "candidate_identity",
  "profile",
  "jobs",
  "matches",
  "applications",
  "calendar",
  "identity",
]);

const CANDIDATE_ROADMAP_IDS = new Set([
  "candidate_career_compass",
  "candidate_interview_prep",
  "candidate_plan",
  "candidate_referrals",
  "candidate_trust",
  "candidate_control_center",
  "candidate_export_preview",
  "candidate_correction_request",
  "candidate_identity_verification",
  "candidate_data_portability",
  "candidate_trust_audit_export",
  "candidate_consent_receipt",
  "candidate_trust_overview",
  "candidate_evidence",
  "career_compass",
  "plan_payments",
  "referrals",
  "trust_center",
  "interview_prep",
  "evidence",
]);

const RECRUITER_PRIMARY_IDS = new Set([
  "recruiter_hub",
  "recruiter_inbox",
  "recruiter_pipeline",
  "recruiter_jobs",
  "recruiter_search",
  "inbox",
  "pipeline",
  "jobs",
  "search",
]);

const RECRUITER_ROADMAP_IDS = new Set([
  "recruiter_trust_review_queue",
  "recruiter_daily_cockpit",
  "recruiter_talent_radar",
  "recruiter_talent_radar_digest",
  "recruiter_talent_pool",
  "recruiter_talent_pool_import",
  "recruiter_analytics",
  "recruiter_integrations",
  "recruiter_demo_pipeline",
  "recruiter_demo_profile_360",
  "recruiter_demo_collaboration",
  "recruiter_demo_trust",
  "recruiter_demo_team",
  "recruiter_demo_communication",
  "recruiter_demo_decision_memory",
  "trust_review_queue",
  "daily_cockpit",
  "talent_pool",
  "talent_radar_digest",
  "talent_radar",
  "analytics",
  "integrations",
]);

const COMPANY_PRIMARY_IDS = new Set([
  "company_dashboard",
  "company_roles",
  "company_pipeline",
  "company_talent_pool",
  "roles",
  "pipeline",
  "talent_pool",
]);

const COMPANY_ROADMAP_IDS = new Set([
  "company_hiring_cockpit",
  "company_hiring_command_center",
  "company_team",
  "company_integrations",
  "company_candidate_trust_summary",
  "company_demo_pipeline",
  "company_demo_profile_360",
  "company_demo_collaboration",
  "company_demo_trust",
  "company_demo_team",
  "company_demo_communication",
  "company_demo_decision_memory",
  "hiring_cockpit",
  "hiring_command_center",
  "team",
  "integrations",
]);

export const CONTROLLED_PILOT_PRIMARY_LIMITS: Readonly<Record<MarketingPersona, number>> = {
  candidate: 8,
  recruiter: 5,
  company: 4,
  investor: 99,
};

function hrefIsBoardOrAdmin(href: string): boolean {
  return BOARD_OR_ADMIN_PREFIXES.some((prefix) => href.startsWith(prefix));
}

function statusToTier(status: WorkspaceModuleStatus): ProductSurfaceTier {
  switch (status) {
    case "live":
      return "LIVE";
    case "pilot":
      return "PILOT";
    case "planned":
      return "COMING_SOON";
    case "not_live":
    case "paused":
      return "HOLD";
    case "needs_setup":
      return "COMING_SOON";
    default:
      return "HOLD";
  }
}

export function classifyProductSurfaceTier(
  persona: MarketingPersona,
  moduleId: string,
  status?: WorkspaceModuleStatus,
): ProductSurfaceTier {
  if (ALWAYS_HIDDEN_MODULE_IDS.has(moduleId) || hrefIsBoardOrAdmin(moduleId)) {
    return "INTERNAL";
  }

  if (persona === "investor") {
    return status ? statusToTier(status) : "PILOT";
  }

  const primaryByPersona: Record<Exclude<MarketingPersona, "investor">, Set<string>> = {
    candidate: CANDIDATE_PRIMARY_IDS,
    recruiter: RECRUITER_PRIMARY_IDS,
    company: COMPANY_PRIMARY_IDS,
  };

  const roadmapByPersona: Record<Exclude<MarketingPersona, "investor">, Set<string>> = {
    candidate: CANDIDATE_ROADMAP_IDS,
    recruiter: RECRUITER_ROADMAP_IDS,
    company: COMPANY_ROADMAP_IDS,
  };

  if (primaryByPersona[persona].has(moduleId)) return "LIVE";
  if (roadmapByPersona[persona].has(moduleId)) {
    return status === "planned" || status === "needs_setup" ? "COMING_SOON" : "PILOT";
  }

  if (status) return statusToTier(status);
  return "INTERNAL";
}

export function shouldHideFromDefaultHub(persona: MarketingPersona, moduleId: string): boolean {
  if (persona === "investor") return false;
  if (ALWAYS_HIDDEN_MODULE_IDS.has(moduleId)) return true;
  if (hrefIsBoardOrAdmin(moduleId)) return true;
  return classifyProductSurfaceTier(persona, moduleId) === "INTERNAL";
}

export function shouldShowAsRoadmap(persona: MarketingPersona, moduleId: string): boolean {
  if (persona === "investor") return false;
  const tier = classifyProductSurfaceTier(persona, moduleId);
  return tier === "PILOT" || tier === "COMING_SOON" || tier === "HOLD";
}

export function isVisibleInControlledPilot(persona: MarketingPersona, moduleId: string): boolean {
  if (persona === "investor") return true;
  return !shouldHideFromDefaultHub(persona, moduleId);
}

export function isVisibleInPublicSurface(href: string): boolean {
  const base = href.split("#")[0]?.split("?")[0] ?? "/";
  if ((PUBLIC_SURFACE_HREFS as readonly string[]).includes(base)) return true;
  if (base.startsWith("/for-")) return true;
  return false;
}

export function splitProductSurfaceRoutes(
  persona: MarketingPersona,
  routes: readonly SystemOfRecordRouteEntry[],
): ProductSurfaceHubSlice<SystemOfRecordRouteEntry> {
  if (persona === "investor") {
    return { primary: routes, roadmap: [], hidden: [] };
  }

  const primary: SystemOfRecordRouteEntry[] = [];
  const roadmap: SystemOfRecordRouteEntry[] = [];
  const hidden: SystemOfRecordRouteEntry[] = [];

  for (const route of routes) {
    if (hrefIsBoardOrAdmin(route.href) || ALWAYS_HIDDEN_MODULE_IDS.has(route.id)) {
      hidden.push(route);
      continue;
    }
    if (shouldHideFromDefaultHub(persona, route.id)) {
      hidden.push(route);
      continue;
    }
    if (shouldShowAsRoadmap(persona, route.id)) {
      roadmap.push(route);
      continue;
    }
    primary.push(route);
  }

  return { primary, roadmap, hidden };
}

export function splitWorkspaceModules(
  persona: MarketingPersona,
  modules: readonly WorkspaceModuleDef[],
): ProductSurfaceHubSlice<WorkspaceModuleDef> {
  if (persona === "investor") {
    return { primary: modules, roadmap: [], hidden: [] };
  }

  const primary: WorkspaceModuleDef[] = [];
  const roadmap: WorkspaceModuleDef[] = [];
  const hidden: WorkspaceModuleDef[] = [];

  for (const mod of modules) {
    if (shouldHideFromDefaultHub(persona, mod.id)) {
      hidden.push(mod);
      continue;
    }
    if (shouldShowAsRoadmap(persona, mod.id)) {
      roadmap.push(mod);
      continue;
    }
    primary.push(mod);
  }

  return { primary, roadmap, hidden };
}

export function tierFromWorkspaceStatus(status: WorkspaceModuleStatus): ProductSurfaceTier {
  return statusToTier(status);
}
