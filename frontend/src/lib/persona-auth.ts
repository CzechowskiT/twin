/**
 * Auth entry points and post-login workspace homes per marketing persona.
 */

import type { MarketingPersona } from "@/lib/marketing-persona";

export type LoginZone = MarketingPersona;

export const LOGIN_PATH: Record<LoginZone, string> = {
  candidate: "/login/candidate",
  recruiter: "/login/recruiter",
  company: "/login/company",
  investor: "/login/investor",
};

export const REGISTER_PATH: Record<LoginZone, string> = {
  candidate: "/register/candidate",
  recruiter: "/register/recruiter",
  company: "/companies/signup",
  investor: "/register/investor",
};

/** Logged-in home for each lane (context picker or tool hub). */
export const WORKSPACE_PATH: Record<LoginZone, string> = {
  candidate: "/workspace/candidate",
  recruiter: "/workspace/recruiter",
  company: "/for-companies",
  investor: "/workspace/investor",
};

export function postLoginPath(zone: LoginZone): string {
  return WORKSPACE_PATH[zone];
}

export function postRegisterPath(zone: LoginZone): string {
  if (zone === "candidate") return "/onboarding";
  return WORKSPACE_PATH[zone];
}

export function loginZoneFromPath(pathname: string): LoginZone | null {
  const base = pathname.split("?")[0]?.replace(/\/$/, "") ?? "";
  if (base === "/login/candidate" || base === "/register/candidate") return "candidate";
  if (base === "/login/recruiter" || base === "/register/recruiter") return "recruiter";
  if (base === "/login/investor" || base === "/register/investor") return "investor";
  if (base === "/login/company") return "company";
  if (base === "/companies/signup") return "company";
  return null;
}

export function workspaceHomePath(persona: MarketingPersona): string {
  return WORKSPACE_PATH[persona];
}
