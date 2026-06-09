"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getToken } from "@/lib/auth";
import {
  isMarketingPersona,
  marketingPersonaFromPath,
  type MarketingPersona,
  PERSONA_STORAGE_KEY,
} from "@/lib/marketing-persona";
import { marketingPersonaFromPathExtended, sessionPersonaLockedByPath } from "@/lib/persona-access";
import { loginZoneFromPath } from "@/lib/persona-auth";
import { safeStorage } from "@/lib/safe-storage";
import { getSessionPersona, setSessionPersona } from "@/lib/session-persona";

type PersonaContextValue = {
  persona: MarketingPersona;
  setPersona: (next: MarketingPersona) => void;
  sessionLocked: boolean;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

function readStoredPersona(): MarketingPersona | null {
  if (typeof window === "undefined") return null;
  const raw = safeStorage.getItem(PERSONA_STORAGE_KEY);
  return raw && isMarketingPersona(raw) ? raw : null;
}

function resolvePersona(pathname: string, hasSession: boolean): MarketingPersona {
  if (hasSession) {
    const pathLocked = sessionPersonaLockedByPath(pathname);
    if (pathLocked) {
      const session = getSessionPersona();
      if (session !== pathLocked) setSessionPersona(pathLocked);
      return pathLocked;
    }
    const session = getSessionPersona();
    if (session) return session;
    const loginZone = loginZoneFromPath(pathname);
    if (loginZone) {
      setSessionPersona(loginZone);
      return loginZone;
    }
    const fromPath =
      marketingPersonaFromPathExtended(pathname) ?? marketingPersonaFromPath(pathname);
    if (fromPath) {
      setSessionPersona(fromPath);
      return fromPath;
    }
    setSessionPersona("candidate");
    return "candidate";
  }

  const fromPath = marketingPersonaFromPathExtended(pathname) ?? marketingPersonaFromPath(pathname);
  return fromPath ?? readStoredPersona() ?? "candidate";
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [persona, setPersonaState] = useState<MarketingPersona>("candidate");
  const [sessionLocked, setSessionLocked] = useState(false);

  useLayoutEffect(() => {
    const hasSession = Boolean(getToken());
    queueMicrotask(() => {
      setSessionLocked(hasSession);
      const resolved = resolvePersona(pathname, hasSession);
      setPersonaState((current) => (current === resolved ? current : resolved));
    });
  }, [pathname]);

  useEffect(() => {
    if (sessionLocked) return;
    safeStorage.setItem(PERSONA_STORAGE_KEY, persona);
  }, [persona, sessionLocked]);

  const setPersona = useCallback(
    (next: MarketingPersona) => {
      if (getToken()) return;
      setPersonaState(next);
    },
    [],
  );

  const value = useMemo(
    () => ({ persona, setPersona, sessionLocked }),
    [persona, setPersona, sessionLocked],
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function useMarketingPersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("useMarketingPersona must be used within PersonaProvider");
  return ctx;
}
