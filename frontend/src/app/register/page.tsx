"use client";

import { Suspense } from "react";

import { RegisterLegacyZoneRedirect } from "@/components/auth/register-legacy-zone-redirect";
import { RegisterZoneHub } from "@/components/auth/register-zone-hub";
import { Shell } from "@/components/ui";

export default function RegisterPage() {
  return (
    <Shell rail>
      <Suspense fallback={null}>
        <RegisterLegacyZoneRedirect>
          <RegisterZoneHub />
        </RegisterLegacyZoneRedirect>
      </Suspense>
    </Shell>
  );
}
