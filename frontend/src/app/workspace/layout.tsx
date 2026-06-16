"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { getToken } from "@/lib/auth";
import { lockAuthRedirectDestination, loginPathWithNext } from "@/lib/login-redirect";
import { WORKSPACE_PATH } from "@/lib/persona-auth";
import { getSessionPersona } from "@/lib/session-persona";

/** /workspace requires a session; the picker redirects to the locked session lane. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { persona } = useMarketingPersona();
  const authDestinationRef = useRef<string | null>(null);
  const loginWithNext = useMemo(() => {
    const destination = lockAuthRedirectDestination(authDestinationRef, pathname, "/login", null);
    return loginPathWithNext("/login", destination);
  }, [pathname]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(loginWithNext);
      return;
    }
    if (pathname === "/workspace") {
      const sessionPersona = getSessionPersona() ?? persona;
      router.replace(WORKSPACE_PATH[sessionPersona]);
    }
  }, [loginWithNext, pathname, persona, router]);

  return <>{children}</>;
}
