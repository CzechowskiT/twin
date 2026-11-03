/**
 * Session-bound marketing persona — set at login/register, cleared at logout.
 * JWT has no role claim; the lane lives in storage and drives workspace gates.
 * Temporary header switcher can change the lane without logout (see switchSessionPersonaWorkspace).
 */

import { isMarketingPersona, type MarketingPersona } from "@/lib/marketing-persona";
import { WORKSPACE_PATH } from "@/lib/persona-auth";
import { safeStorage } from "@/lib/safe-storage";

export const SESSION_PERSONA_STORAGE_KEY = "twin_session_persona";

export function getSessionPersona(): MarketingPersona | null {
  if (typeof window === "undefined") return null;
  const raw = safeStorage.getItem(SESSION_PERSONA_STORAGE_KEY);
  return raw && isMarketingPersona(raw) ? raw : null;
}

export function setSessionPersona(persona: MarketingPersona): void {
  safeStorage.setItem(SESSION_PERSONA_STORAGE_KEY, persona);
}

export function clearSessionPersona(): void {
  safeStorage.removeItem(SESSION_PERSONA_STORAGE_KEY);
}

/**
 * Switch authenticated space: persist lane, then full-load that persona workspace
 * (same effect as logout + login into the other zone for client-gated chrome).
 */
export function switchSessionPersonaWorkspace(persona: MarketingPersona): void {
  setSessionPersona(persona);
  if (typeof window === "undefined") return;
  window.location.assign(WORKSPACE_PATH[persona]);
}
