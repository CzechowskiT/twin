"use client";

import { Suspense } from "react";

import { RegisterLegacyZoneRedirect } from "@/components/auth/register-legacy-zone-redirect";
import { RegisterZoneHub } from "@/components/auth/register-zone-hub";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";

export default function RegisterPage() {
  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <Suspense fallback={null}>
          <RegisterLegacyZoneRedirect>
            <RegisterZoneHub />
          </RegisterLegacyZoneRedirect>
        </Suspense>
      </MarketingPageSurface>
    </Shell>
  );
}
