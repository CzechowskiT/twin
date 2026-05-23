"use client";

import { AuthZoneHub } from "@/components/auth/auth-zone-hub";
import { RegisterHubConversion } from "@/components/auth/register-hub-conversion";
import { REGISTER_PATH } from "@/lib/persona-auth";

export function RegisterZoneHub() {
  return (
    <>
      <RegisterHubConversion />
      <AuthZoneHub hubTitleKey="register.hubTitle" hubLeadKey="register.hubLead" paths={REGISTER_PATH} />
    </>
  );
}
