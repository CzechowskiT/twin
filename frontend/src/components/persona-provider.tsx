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

import {
  isMarketingPersona,
  marketingPersonaFromPath,
  type MarketingPersona,
  PERSONA_STORAGE_KEY,
} from "@/lib/marketing-persona";
import { safeStorage } from "@/lib/safe-storage";

type PersonaContextValue = {
  persona: MarketingPersona;
  setPersona: (next: MarketingPersona) => void;
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

function readStoredPersona(): MarketingPersona | null {
  if (typeof window === "undefined") return null;
  const raw = safeStorage.getItem(PERSONA_STORAGE_KEY);
  return raw && isMarketingPersona(raw) ? raw : null;
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  /** Default matches primary product lane; hydrated from path or storage after mount. */
  const [persona, setPersonaState] = useState<MarketingPersona>("candidate");

  useLayoutEffect(() => {
    const fromPath = marketingPersonaFromPath(pathname);
    const stored = readStoredPersona();
    const resolved = fromPath ?? stored ?? "candidate";
    setPersonaState((current) => (current === resolved ? current : resolved));
  }, [pathname]);

  useEffect(() => {
    safeStorage.setItem(PERSONA_STORAGE_KEY, persona);
  }, [persona]);

  const setPersona = useCallback((next: MarketingPersona) => {
    setPersonaState(next);
  }, []);

  const value = useMemo(() => ({ persona, setPersona }), [persona, setPersona]);

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function useMarketingPersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("useMarketingPersona must be used within PersonaProvider");
  return ctx;
}
