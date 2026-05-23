"use client";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { REGISTER_PATH } from "@/lib/persona-auth";

export function RegisterZoneHub() {
  return (
    <AuthZoneHub hubTitleKey="register.hubTitle" hubLeadKey="register.hubLead" paths={REGISTER_PATH} />
  );
}
