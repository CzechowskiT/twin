"use client";

import { Suspense } from "react";

import { LoginZoneHub } from "@/components/auth/login-zone-hub";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

function LoginPageFallback() {
  const { t } = useTranslation();
  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <p className="twin-muted text-sm">{t("login.signingIn")}</p>
      </MarketingPageSurface>
    </Shell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <Shell wide>
        <MarketingPageSurface wide withCard={false}>
          <LoginZoneHub />
        </MarketingPageSurface>
      </Shell>
    </Suspense>
  );
}
