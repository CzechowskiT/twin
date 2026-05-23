"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { isMarketingPersona } from "@/lib/marketing-persona";
import { REGISTER_PATH, type LoginZone } from "@/lib/persona-auth";

/** `/register?zone=candidate` → `/register/candidate` (demo CTAs and bookmarks). */
export function RegisterLegacyZoneRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const zoneRaw = searchParams.get("zone");

  useEffect(() => {
    if (!zoneRaw || !isMarketingPersona(zoneRaw)) return;
    const target = REGISTER_PATH[zoneRaw as LoginZone];
    if (target !== "/register") router.replace(target);
  }, [router, zoneRaw]);

  if (zoneRaw && isMarketingPersona(zoneRaw) && REGISTER_PATH[zoneRaw as LoginZone] !== "/register") {
    return null;
  }

  return <>{children}</>;
}
