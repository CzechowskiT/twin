"use client";

import { LoginZoneHub } from "@/components/auth/login-zone-hub";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";

export default function LoginPage() {
  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <LoginZoneHub />
      </MarketingPageSurface>
    </Shell>
  );
}
