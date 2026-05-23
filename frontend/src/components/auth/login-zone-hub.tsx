"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { LoginRoleHintModal } from "@/components/auth/login-role-hint-modal";
import { LOGIN_PATH } from "@/lib/persona-auth";

export function LoginZoneHub() {
  const searchParams = useSearchParams();
  const fromLogin = searchParams.get("from") === "login";
  const [hintDismissed, setHintDismissed] = useState(false);

  return (
    <>
      <AuthZoneHub
        hubTitleKey="login.hubTitle"
        hubLeadKey="login.hubLead"
        paths={LOGIN_PATH}
        highlightRoleCards={fromLogin}
      />
      {fromLogin ? (
        <LoginRoleHintModal open={!hintDismissed} onClose={() => setHintDismissed(true)} />
      ) : null}
    </>
  );
}
