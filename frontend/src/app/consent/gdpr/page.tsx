"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

function RedirectToRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const n = searchParams.get("next");
    const next = n?.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
    router.replace(next);
  }, [router, searchParams]);

  return (
    <Shell rail>
      <Card>
        <p className="twin-muted text-sm">{t("consentGdpr.submitting")}</p>
      </Card>
    </Shell>
  );
}

export default function GdprConsentRedirectPage() {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <Shell rail>
          <Card>
            <p className="twin-muted text-sm">{t("consentGdpr.submitting")}</p>
          </Card>
        </Shell>
      }
    >
      <RedirectToRegister />
    </Suspense>
  );
}
