"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { setToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

const ERROR_I18N: Record<string, TranslationKey> = {
  linkedin_denied: "authCallback.errorLinkedinDenied",
  invalid_state: "authCallback.errorInvalidState",
  linkedin_failed: "authCallback.errorLinkedinFailed",
  inactive: "authCallback.errorInactive",
};

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
      router.replace(path);
      return;
    }

    if (error && error in ERROR_I18N) {
      setMessage(t(ERROR_I18N[error]));
      return;
    }

    setMessage(t("authCallback.errorUnknown"));
  }, [router, searchParams, t]);

  return (
    <Shell>
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
        <Shell>
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
