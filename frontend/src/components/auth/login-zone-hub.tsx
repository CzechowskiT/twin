"use client";

import { useSearchParams } from "next/navigation";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { LOGIN_PATH } from "@/lib/persona-auth";

export function LoginZoneHub() {
  const searchParams = useSearchParams();
  const fromLogin = searchParams.get("from") === "login";

  return (
    <AuthZoneHub
      hubTitleKey="login.hubTitle"
      hubLeadKey="login.hubLead"
      paths={LOGIN_PATH}
      roleHintKey={fromLogin ? "login.selectRoleHint" : undefined}
      highlightRoleCards={fromLogin}
    />
  );
}
