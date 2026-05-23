/**
 * Persona-aware marketing pricing destinations (Cennik / nav.pricing).
 * Seat packs and company programs live on persona lanes, not a single candidate redirect.
 */
import { PERSONA_ROUTE, type MarketingPersona } from "@/lib/marketing-persona";
import type { PersonaId } from "@/lib/persona-pages";

export const PERSONA_PRICING_HASH = "persona-pricing";

const PERSONA_LANE_PATHS = new Set([
  "/for-candidates",
  "/for-recruiters",
  "/for-companies",
  "/for-investors",
]);

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

export function marketingPersonaToPersonaId(persona: MarketingPersona): PersonaId {
  const map: Record<MarketingPersona, PersonaId> = {
    candidate: "candidates",
    recruiter: "recruiters",
    company: "companies",
    investor: "investors",
  };
  return map[persona];
}

/** Canonical href for the active persona’s pricing grid (persona marketing pages). */
export function pricingHrefForPersona(persona: MarketingPersona): string {
  return `${PERSONA_ROUTE[persona]}#${PERSONA_PRICING_HASH}`;
}

/** Employer procurement pricing (company lane). */
export function employerPricingHref(): string {
  return pricingHrefForPersona("company");
}

/** True when switching persona should keep the user on a pricing section, not workspace home. */
export function isPersonaPricingPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/pricing" || path === "/for-employers/pricing") return true;
  return PERSONA_LANE_PATHS.has(path);
}
