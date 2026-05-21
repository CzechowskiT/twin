/**
 * Persona boundaries — candidate app vs recruiter vs company (B2B) must not mix in UI or routes.
 */

import {
  MARKETING_PERSONAS,
  PERSONA_ROUTE,
  type MarketingPersona,
} from "@/lib/marketing-persona";

export type PersonaAudience = MarketingPersona;

/** Routes that imply this persona when visited (syncs PersonaProvider). */
const PATH_IMPLIES_PERSONA: { prefix: string; persona: MarketingPersona }[] = [
  { prefix: "/for-candidates", persona: "candidate" },
  { prefix: "/dashboard", persona: "candidate" },
  { prefix: "/profile", persona: "candidate" },
  { prefix: "/onboarding", persona: "candidate" },
  { prefix: "/for-recruiters", persona: "recruiter" },
  { prefix: "/recruiter", persona: "recruiter" },
  { prefix: "/for-companies", persona: "company" },
  { prefix: "/calculator/b2b", persona: "company" },
  { prefix: "/calculator", persona: "company" },
];

/** Only these personas may access the path prefix (longest match wins). */
const PREFIX_ALLOWED: { prefix: string; allowed: readonly MarketingPersona[] }[] = [
  { prefix: "/dashboard", allowed: ["candidate"] },
  { prefix: "/profile", allowed: ["candidate"] },
  { prefix: "/onboarding", allowed: ["candidate"] },
  { prefix: "/calculator/b2b", allowed: ["company"] },
  { prefix: "/calculator", allowed: ["company"] },
  { prefix: "/recruiter", allowed: ["recruiter", "company"] },
  { prefix: "/for-recruiters", allowed: ["recruiter", "candidate", "company"] },
  { prefix: "/for-companies", allowed: ["company", "candidate", "recruiter"] },
  { prefix: "/for-candidates", allowed: ["candidate", "recruiter", "company"] },
];

const ALWAYS_ALLOWED_PREFIXES = [
  "/",
  "/about",
  "/faq",
  "/contact",
  "/login",
  "/register",
  "/waitlist",
  "/demo",
  "/status",
  "/developers",
  "/privacy",
  "/terms",
  "/cookies",
  "/media",
  "/careers",
  "/partners",
  "/case-studies",
  "/testimonials",
  "/beta",
  "/admin",
  "/placement",
  "/consent",
  "/auth",
  "/api",
];

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

export function marketingPersonaFromPathExtended(pathname: string): MarketingPersona | null {
  const path = normalizePath(pathname);
  let best: { prefix: string; persona: MarketingPersona } | null = null;
  for (const row of PATH_IMPLIES_PERSONA) {
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      if (!best || row.prefix.length > best.prefix.length) best = row;
    }
  }
  return best?.persona ?? null;
}

function longestAllowedRule(path: string): { prefix: string; allowed: readonly MarketingPersona[] } | null {
  let best: { prefix: string; allowed: readonly MarketingPersona[] } | null = null;
  for (const row of PREFIX_ALLOWED) {
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      if (!best || row.prefix.length > best.prefix.length) best = row;
    }
  }
  return best;
}

export function isPathAllowedForPersona(pathname: string, persona: MarketingPersona): boolean {
  const path = normalizePath(pathname);
  for (const prefix of ALWAYS_ALLOWED_PREFIXES) {
    if (path === prefix || (prefix !== "/" && path.startsWith(`${prefix}/`))) return true;
  }
  const rule = longestAllowedRule(path);
  if (!rule) return true;
  return rule.allowed.includes(persona);
}

export function isCandidateWorkspacePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return (
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/profile" ||
    path.startsWith("/profile/") ||
    path === "/onboarding" ||
    path.startsWith("/onboarding/")
  );
}

export type HeaderGrowthLabelKey =
  | "nav.calculator"
  | "nav.waitlist"
  | "nav.forCompanies"
  | "nav.forRecruiters"
  | "nav.forCandidates";

export type HeaderGrowthLink = { href: string; labelKey: HeaderGrowthLabelKey };

export function headerGrowthLinksForPersona(persona: MarketingPersona): HeaderGrowthLink[] {
  if (persona === "company") {
    return [
      { href: "/calculator/b2b", labelKey: "nav.calculator" },
      { href: "/for-companies", labelKey: "nav.forCompanies" },
    ];
  }
  if (persona === "recruiter") {
    return [
      { href: "/for-recruiters", labelKey: "nav.forRecruiters" },
      { href: "/waitlist", labelKey: "nav.waitlist" },
    ];
  }
  return [
    { href: "/for-candidates", labelKey: "nav.forCandidates" },
    { href: "/waitlist", labelKey: "nav.waitlist" },
  ];
}

export function showCandidateProductNav(persona: MarketingPersona): boolean {
  return persona === "candidate";
}

export function footerExploreHrefsForPersona(persona: MarketingPersona): string[] {
  const common = ["/", "/waitlist", "/demo", "/faq", "/status", "/developers", "/login", "/register"];
  if (persona === "company") {
    return [...common, "/for-companies", "/calculator/b2b", "/contact"];
  }
  if (persona === "recruiter") {
    return [...common, "/for-recruiters", "/recruiter/inbox", "/contact"];
  }
  return [...common, "/for-candidates", "/register", "/login"];
}

export function personaGateRedirect(persona: MarketingPersona): string {
  return PERSONA_ROUTE[persona];
}

export function allPersonas(): readonly MarketingPersona[] {
  return MARKETING_PERSONAS;
}
