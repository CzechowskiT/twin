"use client";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { LOGIN_PATH } from "@/lib/persona-auth";

export function LoginZoneHub() {
  return <AuthZoneHub hubTitleKey="login.hubTitle" hubLeadKey="login.hubLead" paths={LOGIN_PATH} />;
}
