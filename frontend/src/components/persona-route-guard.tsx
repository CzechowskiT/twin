"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMarketingPersona } from "@/components/persona-provider";
import { getToken } from "@/lib/auth";
import { sessionPersonaHomeRedirect } from "@/lib/persona-access";
import { getSessionPersona, setSessionPersona } from "@/lib/session-persona";
import { resolveEffectiveSessionPersona } from "@/lib/persona-access";

/** Redirects signed-in users away from another persona's product routes. */
export function PersonaRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { persona } = useMarketingPersona();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const sessionPersona = resolveEffectiveSessionPersona(pathname, getSessionPersona() ?? persona);
    if (!getSessionPersona()) {
      setSessionPersona(sessionPersona);
    }

    const redirectUrl = sessionPersonaHomeRedirect(pathname, sessionPersona);
    if (redirectUrl) {
      router.replace(redirectUrl);
    }
  }, [pathname, persona, router]);

  return null;
}
