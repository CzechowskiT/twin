"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function VerifyEmailInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token")?.trim() || "";
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (!tokenFromUrl) return;
    (async () => {
      try {
        await apiFetch("/api/v1/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token: tokenFromUrl }),
        });
        setStatus("ok");
        toast.success(t("verifyEmail.success"));
        if (getToken()) router.replace("/dashboard");
      } catch {
        setStatus("fail");
        toast.error(t("verifyEmail.invalid"));
      }
    })();
  }, [tokenFromUrl, router, t]);

  return (
    <Shell rail>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("verifyEmail.pageTitle")}</h1>
        {tokenFromUrl ? (
          <p className="twin-muted text-sm">
            {status === "ok"
              ? t("verifyEmail.success")
              : status === "fail"
                ? t("verifyEmail.invalid")
                : t("common.loading")}
          </p>
        ) : (
          <>
            <p className="twin-muted mb-4 text-sm leading-relaxed">{t("verifyEmail.pageBody")}</p>
            <Link href="/dashboard" className="twin-btn-solid twin-touch-target inline-block text-center text-sm">
              {t("nav.dashboard")}
            </Link>
          </>
        )}
      </Card>
    </Shell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="twin-muted p-8 text-sm">…</p>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
