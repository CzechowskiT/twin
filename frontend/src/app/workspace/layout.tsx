"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useMarketingPersona } from "@/components/persona-provider";
import { getToken } from "@/lib/auth";
import { WORKSPACE_PATH } from "@/lib/persona-auth";
import { getSessionPersona } from "@/lib/session-persona";

/** /workspace requires a session; the picker redirects to the locked session lane. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { persona } = useMarketingPersona();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (pathname === "/workspace") {
      const sessionPersona = getSessionPersona() ?? persona;
      router.replace(WORKSPACE_PATH[sessionPersona]);
    }
  }, [pathname, persona, router]);

  return <>{children}</>;
}
