/**
 * Persona boundaries — candidate app vs recruiter vs company (employers) vs investor lanes.
 */

import {
  MARKETING_PERSONAS,
  PERSONA_ROUTE,
  type MarketingPersona,
} from "@/lib/marketing-persona";
import { LOGIN_PATH, REGISTER_PATH } from "@/lib/persona-auth";
import type { TranslationKey } from "@/lib/i18n";

export type PersonaAudience = MarketingPersona;

/** Routes that imply this persona when visited (syncs PersonaProvider). */
const PATH_IMPLIES_PERSONA: { prefix: string; persona: MarketingPersona }[] = [
  { prefix: "/for-candidates", persona: "candidate" },
  { prefix: "/dashboard/referrals", persona: "candidate" },
  { prefix: "/dashboard", persona: "candidate" },
  { prefix: "/profile", persona: "candidate" },
  { prefix: "/onboarding", persona: "candidate" },
  { prefix: "/for-recruiters", persona: "recruiter" },
  { prefix: "/recruiter", persona: "recruiter" },
  { prefix: "/for-companies", persona: "company" },
  { prefix: "/for-investors", persona: "investor" },
  { prefix: "/companies/signup", persona: "company" },
  { prefix: "/workspace/candidate", persona: "candidate" },
  { prefix: "/workspace/recruiter", persona: "recruiter" },
  { prefix: "/workspace/investor", persona: "investor" },
  { prefix: "/workspace", persona: "candidate" },
  { prefix: "/recruiter/integrations", persona: "recruiter" },
  { prefix: "/investor", persona: "investor" },
  { prefix: "/login/candidate", persona: "candidate" },
  { prefix: "/login/recruiter", persona: "recruiter" },
  { prefix: "/login/investor", persona: "investor" },
  { prefix: "/register/candidate", persona: "candidate" },
  { prefix: "/register/recruiter", persona: "recruiter" },
  { prefix: "/register/investor", persona: "investor" },
  { prefix: "/calculator/b2b", persona: "company" },
  { prefix: "/calculator", persona: "recruiter" },
];

/** Only these personas may access the path prefix (longest match wins). */
const PREFIX_ALLOWED: { prefix: string; allowed: readonly MarketingPersona[] }[] = [
  { prefix: "/dashboard", allowed: ["candidate"] },
  { prefix: "/profile", allowed: ["candidate"] },
  { prefix: "/onboarding", allowed: ["candidate"] },
  { prefix: "/workspace/candidate", allowed: ["candidate"] },
  { prefix: "/workspace/recruiter", allowed: ["recruiter", "investor"] },
  { prefix: "/workspace/investor", allowed: ["investor"] },
  { prefix: "/workspace", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/investor", allowed: ["investor"] },
  { prefix: "/calculator/b2b", allowed: ["company", "candidate", "recruiter"] },
  { prefix: "/calculator", allowed: ["company", "recruiter"] },
  { prefix: "/recruiter/integrations", allowed: ["recruiter", "investor", "company"] },
  { prefix: "/recruiter", allowed: ["recruiter", "investor"] },
  { prefix: "/for-investors", allowed: ["investor", "candidate", "recruiter", "company"] },
  { prefix: "/for-recruiters", allowed: ["recruiter", "candidate", "company", "investor"] },
  { prefix: "/for-companies", allowed: ["company", "candidate", "recruiter", "investor"] },
  { prefix: "/for-candidates", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/companies/signup", allowed: ["company", "investor", "recruiter", "candidate"] },
  { prefix: "/demo", allowed: ["candidate", "recruiter", "company", "investor"] },
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
  "/workspace",
  "/investor",
];

const MARKETING_HUB_PATHS = new Set([
  "/",
  "/about",
  "/faq",
  "/contact",
  "/case-studies",
  "/partners",
  "/media",
  "/careers",
  "/testimonials",
]);

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base || "/";
}

function pathMatchesPersonaPrefix(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  if (prefix === "/calculator") return false;
  return path.startsWith(`${prefix}/`);
}

export function marketingPersonaFromPathExtended(pathname: string): MarketingPersona | null {
  const path = normalizePath(pathname);
  let best: { prefix: string; persona: MarketingPersona } | null = null;
  for (const row of PATH_IMPLIES_PERSONA) {
    if (pathMatchesPersonaPrefix(path, row.prefix)) {
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

export function isMarketingHubPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return MARKETING_HUB_PATHS.has(path);
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
  | "nav.demo"
  | "nav.calculator"
  | "nav.forCompanies"
  | "nav.forInvestors"
  | "nav.forRecruiters";

export type GrowthCtaVariant = "candidate" | "recruiter" | "company" | "investor";

export type HeaderGrowthLink = {
  href: string;
  labelKey: HeaderGrowthLabelKey;
  variant: GrowthCtaVariant;
};

/**
 * One primary marketing CTA beside the logo (logged-out only).
 * Logged-in users use PersonaSwitcher → workspace; no duplicate pills here.
 */
export function headerGrowthLinksForPersona(
  persona: MarketingPersona,
  pathname: string,
  hasSession: boolean,
): HeaderGrowthLink[] {
  if (hasSession || isMarketingHubPath(pathname)) return [];
  if (persona === "candidate") {
    return [{ href: "/demo", labelKey: "nav.demo", variant: "candidate" }];
  }
  if (persona === "recruiter") {
    return [{ href: "/calculator/b2b", labelKey: "nav.calculator", variant: "recruiter" }];
  }
  if (persona === "company") {
    return [{ href: "/for-companies", labelKey: "nav.forCompanies", variant: "company" }];
  }
  return [{ href: "/for-investors", labelKey: "nav.forInvestors", variant: "investor" }];
}

export function showCandidateProductNav(persona: MarketingPersona): boolean {
  return persona === "candidate";
}

export type HeaderAccountLink = { href: string; labelKey: TranslationKey; isLogout?: boolean };

export function headerAccountLinks(
  persona: MarketingPersona,
  hasSession: boolean,
): HeaderAccountLink[] {
  if (!hasSession) {
    return [
      { href: "/login", labelKey: "nav.login" },
      { href: "/register", labelKey: "nav.register" },
    ];
  }
  if (persona === "candidate") {
    return [
      { href: "/dashboard", labelKey: "nav.dashboard" },
      { href: "#", labelKey: "dashboard.logout", isLogout: true },
    ];
  }
  if (persona === "recruiter") {
    return [
      { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
      { href: "#", labelKey: "dashboard.logout", isLogout: true },
    ];
  }
  if (persona === "investor") {
    return [
      { href: "/workspace/investor", labelKey: "workspace.investorHome" },
      { href: "#", labelKey: "dashboard.logout", isLogout: true },
    ];
  }
  return [
    { href: "/for-companies", labelKey: "nav.forCompanies" },
    { href: "/contact", labelKey: "nav.contact" },
  ];
}

export function footerExploreHrefsForPersona(persona: MarketingPersona): string[] {
  const common = ["/", "/waitlist", "/demo", "/faq", "/status", "/developers"];
  if (persona === "company") {
    return [
      ...common,
      "/for-companies",
      "/calculator/b2b",
      "/companies/signup",
      "/contact",
    ];
  }
  if (persona === "investor") {
    return [
      ...common,
      "/for-investors",
      "/workspace/investor",
      "/investor/calculator",
      "/investor/metrics",
      "/login/investor",
      "/contact",
    ];
  }
  if (persona === "recruiter") {
    return [
      ...common,
      "/for-recruiters",
      "/workspace/recruiter",
      "/calculator/b2b",
      "/recruiter/inbox",
      "/login/recruiter",
      "/contact",
    ];
  }
  return [
    ...common,
    "/for-candidates",
    "/workspace/candidate",
    "/login/candidate",
    "/register/candidate",
    "/contact",
  ];
}

export function personaGateRedirect(persona: MarketingPersona): string {
  return PERSONA_ROUTE[persona];
}

export function allPersonas(): readonly MarketingPersona[] {
  return MARKETING_PERSONAS;
}
