/**
 * Canonical module routes per persona — single map for cards, nav, and deep-link guards.
 */

import { CANDIDATE_WORKSPACE_MODULES } from "@/lib/candidate-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "@/lib/company-workspace-modules";
import { INVESTOR_WORKSPACE_MODULES } from "@/lib/investor-workspace-modules";
import { RECRUITER_WORKSPACE_MODULES } from "@/lib/recruiter-workspace-modules";
import type { MarketingPersona } from "@/lib/marketing-persona";
import type { WorkspaceModuleDef } from "@/lib/workspace-module-status";

function moduleHref(mod: WorkspaceModuleDef): string {
  return mod.anchor ? `${mod.href}${mod.anchor}` : mod.href;
}

function collectHrefs(modules: readonly WorkspaceModuleDef[]): readonly string[] {
  return modules.map(moduleHref);
}

/** All workspace module card targets keyed by persona lane. */
export const PERSONA_MODULE_ROUTES: Record<MarketingPersona, readonly string[]> = {
  candidate: collectHrefs(CANDIDATE_WORKSPACE_MODULES),
  recruiter: collectHrefs(RECRUITER_WORKSPACE_MODULES),
  company: collectHrefs(COMPANY_WORKSPACE_MODULES),
  investor: collectHrefs(INVESTOR_WORKSPACE_MODULES),
};

function normalizeRoute(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

/** True when pathname matches a module card href for the persona (hash anchors ignored). */
export function isPersonaModuleDeepLink(pathname: string, persona: MarketingPersona): boolean {
  const path = normalizeRoute(pathname);
  return PERSONA_MODULE_ROUTES[persona].some((href) => normalizeRoute(href) === path);
}
