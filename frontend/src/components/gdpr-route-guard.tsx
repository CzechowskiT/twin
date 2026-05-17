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

/** Marketing / public site — prefix match (handles subpaths). `/` handled separately. */
const PUBLIC_MARKETING_PREFIXES: readonly string[] = [
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
];

export function normalizePathnameForGdpr(pathname: string | null | undefined): string {
  const raw = (pathname ?? "").trim();
  const noQuery = (raw.split("?")[0] ?? "").trim();
  let base = noQuery === "" ? "/" : noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  if (base !== "/" && base.endsWith("/")) base = base.slice(0, -1);
  if (base === "") return "/";
  return base;
}

function isPublicMarketingPath(normalized: string): boolean {
  if (normalized === "/") return true;
  return PUBLIC_MARKETING_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function shouldSkipGdprGuard(normalized: string): boolean {
  if (GDPR_SKIP_PATHS.has(normalized)) return true;
  if (isPublicMarketingPath(normalized)) return true;
  return false;
}

export function GdprRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const normalized = normalizePathnameForGdpr(pathname);
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
