"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { hasCoreConsents, type AuthMeCoreConsents } from "@/lib/core-consents";

const GDPR_SKIP_PATHS = new Set([
  "/consent/gdpr",
  "/auth/callback",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/beta",
  "/beta/join",
  "/beta/dashboard",
  "/admin/beta",
]);

/** Public marketing — logged-in users without consents may browse here without `/consent/gdpr`. */
const GDPR_SKIP_MARKETING = new Set([
  "/",
  "/about",
  "/case-studies",
  "/faq",
  "/partners",
  "/media",
  "/careers",
  "/contact",
  "/demo",
  "/calculator",
  "/for-companies",
  "/for-recruiters",
  "/for-candidates",
]);

function shouldSkipGdprGuard(path: string): boolean {
  if (GDPR_SKIP_PATHS.has(path)) return true;
  if (GDPR_SKIP_MARKETING.has(path)) return true;
  return false;
}

export function GdprRouteGuard() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const raw = pathname.split("?")[0] ?? "/";
  const normalized = raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
  const ranForPath = useRef<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      ranForPath.current = null;
      return;
    }
    if (shouldSkipGdprGuard(normalized)) {
      ranForPath.current = null;
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const me = await apiFetch<AuthMeCoreConsents>("/api/v1/auth/me", {}, token);
          if (cancelled) return;
          if (!hasCoreConsents(me)) {
            const next = encodeURIComponent(normalized || "/dashboard");
            ranForPath.current = normalized;
            router.replace(`/register?next=${next}`);
          } else {
            ranForPath.current = null;
          }
        } catch {
          ranForPath.current = null;
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [normalized, router, pathname]);

  return null;
}
