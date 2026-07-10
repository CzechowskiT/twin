"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { LoginRoleHintModal } from "@/components/auth/login-role-hint-modal";
import { LOGIN_PATH } from "@/lib/persona-auth";
import {
  INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  LOGIN_HUB_INVESTOR_ZONE_HREF,
} from "@/lib/seven-day-d5-investor";

export function LoginZoneHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLogin = searchParams.get("from") === "login";
  const [hintDismissed, setHintDismissed] = useState(false);

  const hubPaths = useMemo(
    () => ({
      ...LOGIN_PATH,
      investor: INVESTOR_PUBLIC_LOGIN_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE
        ? LOGIN_HUB_INVESTOR_ZONE_HREF
        : LOGIN_PATH.investor,
    }),
    [],
  );

  useEffect(() => {
    const err = searchParams.get("error");
    if (err?.endsWith("_not_configured")) {
      const next = searchParams.get("next");
      const q = new URLSearchParams({ error: err });
      if (next?.startsWith("/") && !next.startsWith("//")) q.set("next", next);
      router.replace(`/login/candidate?${q.toString()}`);
    }
  }, [router, searchParams]);

  return (
    <>
      <AuthZoneHub
        hubTitleKey="login.hubTitle"
        hubLeadKey="login.hubLead"
        paths={hubPaths}
        highlightRoleCards={fromLogin}
      />
      {fromLogin ? (
        <LoginRoleHintModal open={!hintDismissed} onClose={() => setHintDismissed(true)} />
      ) : null}
    </>
  );
}
