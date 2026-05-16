"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { setToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";

type AuthMe = { gdpr_consent_at: string | null };

function authErrorKey(error: string): TranslationKey {
  if (error === "linkedin_denied") return "authCallback.errorLinkedinDenied";
  if (error === "linkedin_failed") return "authCallback.errorLinkedinFailed";
  if (error.endsWith("_denied")) return "authCallback.errorOAuthDenied";
  if (error.endsWith("_failed")) return "authCallback.errorOAuthFailed";
  const map: Record<string, TranslationKey> = {
    invalid_state: "authCallback.errorInvalidState",
    inactive: "authCallback.errorInactive",
    linkedin_not_configured: "authCallback.errorLinkedinNotConfigured",
  };
  return map[error] ?? "authCallback.errorUnknown";
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      setToken(token);
      const next = searchParams.get("next");
      const path = next?.startsWith("/") ? next : "/dashboard";
      queueMicrotask(() => {
        void (async () => {
          try {
            const me = await apiFetch<AuthMe>("/api/v1/auth/me", {}, token);
            if (!me.gdpr_consent_at) {
              router.replace(`/consent/gdpr?next=${encodeURIComponent(path)}`);
              return;
            }
          } catch {
            /* if /me fails, still send user onward */
          }
          router.replace(path);
        })();
      });
      return;
    }

    if (error) {
      queueMicrotask(() => {
        setMessage(t(authErrorKey(error)));
      });
      return;
    }

    queueMicrotask(() => {
      setMessage(t("authCallback.errorUnknown"));
    });
  }, [router, searchParams, t]);

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-4 text-2xl font-semibold">{t("authCallback.title")}</h1>
        <p className="twin-muted text-sm">
          {message ?? t("authCallback.signingIn")}
        </p>
      </Card>
    </Shell>
  );
}

export default function AuthCallbackPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <Shell rail>
          <Card>
            <p className="twin-muted text-sm">{t("authCallback.signingIn")}</p>
          </Card>
        </Shell>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
