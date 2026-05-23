/**
 * Session-bound marketing persona — set at login/register, cleared at logout.
 * While a token exists, this lane is locked; switching roles requires logout + zone login.
 */

import { isMarketingPersona, type MarketingPersona } from "@/lib/marketing-persona";
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
