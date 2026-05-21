"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Me = { onboarding_completed_at?: string | null };

const BYPASS_PREFIXES = ["/onboarding", "/profile", "/login", "/register", "/auth"];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** US-C005: resume onboarding until the user marks it complete. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || shouldBypass(pathname)) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<Me>("/api/v1/auth/me", {}, token);
        if (!cancelled && !me.onboarding_completed_at) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        /* allow dashboard if /me fails transiently */
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <p className="twin-muted px-4 py-8 text-sm">…</p>;
  }

  return <>{children}</>;
}
