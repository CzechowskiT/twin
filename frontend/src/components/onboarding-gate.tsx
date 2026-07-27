"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isDemoUserEmail } from "@/lib/demo-user";

type Me = { email?: string; onboarding_completed_at?: string | null };

const BYPASS_PREFIXES = ["/onboarding", "/profile", "/login", "/register", "/auth", "/dashboard/calendar"];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** US-C005: resume onboarding until the user marks it complete. */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || shouldBypass(pathname)) {
      queueMicrotask(() => setReady(true));
      return;
    }

    let cancelled = false;
    (async () => {
      let attempts = 0;
      while (attempts < 3 && !cancelled) {
        attempts += 1;
        try {
          const me = await apiFetch<Me>("/api/v1/auth/me", {}, token);
          if (!cancelled && !me.onboarding_completed_at) {
            if (isDemoUserEmail(me.email)) {
              try {
                await apiFetch("/api/v1/auth/onboarding/complete", { method: "POST" }, token);
              } catch {
                /* still allow dashboard for demo account */
              }
            } else {
              router.replace("/onboarding");
              return;
            }
          }
          if (!cancelled) setReady(true);
          return;
        } catch {
          if (attempts >= 3) {
            if (!cancelled) {
              setBlocked(true);
              setReady(true);
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 400 * attempts));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <p className="twin-muted px-4 py-8 text-sm">{t("common.loadingEllipsis")}</p>;
  }

  if (blocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center" data-testid="onboarding-gate-blocked">
        <p className="text-sm text-[var(--foreground)]">{t("common.sessionCheckFailed")}</p>
        <p className="twin-muted mt-2 text-sm">{t("common.tryAgainOrLogin")}</p>
        <a className="mt-4 inline-block text-sm underline" href="/login">
          {t("nav.login")}
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
