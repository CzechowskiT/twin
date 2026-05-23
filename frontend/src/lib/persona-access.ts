/**
 * Persona boundaries — candidate app vs recruiter vs company (employers) vs investor lanes.
 */

import {
  MARKETING_PERSONAS,
  PERSONA_ROUTE,
  type MarketingPersona,
} from "@/lib/marketing-persona";
import { LOGIN_PATH, REGISTER_PATH, WORKSPACE_PATH } from "@/lib/persona-auth";
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
  { prefix: "/company/integrations", persona: "company" },
  { prefix: "/dashboard/integrations", persona: "candidate" },
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
  { prefix: "/workspace/recruiter", allowed: ["recruiter"] },
  { prefix: "/workspace/investor", allowed: ["investor"] },
  { prefix: "/workspace", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/investor", allowed: ["investor"] },
  { prefix: "/calculator/b2b", allowed: ["company", "recruiter"] },
  { prefix: "/calculator", allowed: ["recruiter"] },
  { prefix: "/recruiter/integrations", allowed: ["recruiter"] },
  { prefix: "/company/integrations", allowed: ["company", "recruiter"] },
  { prefix: "/dashboard/integrations", allowed: ["candidate"] },
  { prefix: "/recruiter", allowed: ["recruiter"] },
  { prefix: "/for-investors", allowed: ["investor"] },
  { prefix: "/for-recruiters", allowed: ["recruiter"] },
  { prefix: "/for-companies", allowed: ["company"] },
  { prefix: "/for-candidates", allowed: ["candidate"] },
  { prefix: "/companies/signup", allowed: ["company"] },
  { prefix: "/demo", allowed: ["candidate"] },
];

const ALWAYS_ALLOWED_PREFIXES = [
  "/",
  "/about",
  "/faq",
  "/contact",
  "/login",
  "/register",
  "/waitlist",
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
  "/how-it-works",
  "/pricing",
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

/** Legal, auth hub, and shared marketing pages reachable while signed in. */
const SESSION_NEUTRAL_PREFIXES = [
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/faq",
  "/status",
  "/developers",
  "/about",
  "/how-it-works",
  "/waitlist",
  "/case-studies",
  "/partners",
  "/media",
  "/careers",
  "/testimonials",
  "/login",
  "/register",
  "/forgot-password",
  "/auth",
  "/api",
  "/pricing",
];

function isSessionNeutralPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/") return true;
  for (const prefix of SESSION_NEUTRAL_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/** Strict lane check for authenticated sessions — redirects cross-persona product routes. */
export function sessionPersonaHomeRedirect(
  pathname: string,
  persona: MarketingPersona,
): string | null {
  const path = normalizePath(pathname);
  if (isSessionNeutralPath(path)) return null;
  if (isPathAllowedForPersona(pathname, persona)) return null;
  return WORKSPACE_PATH[persona];
}

export function pricingPathForPersona(persona: MarketingPersona): string {
  const anchor = "#persona-pricing";
  if (persona === "recruiter") return `${PERSONA_ROUTE.recruiter}${anchor}`;
  if (persona === "company") return `${PERSONA_ROUTE.company}${anchor}`;
  if (persona === "investor") return `${PERSONA_ROUTE.investor}${anchor}`;
  return `${PERSONA_ROUTE.candidate}${anchor}`;
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
  | "nav.waitlist"
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

export type HeaderSessionProductLink = {
  href: string;
  labelKey: "nav.demo";
};

/** Logged-in candidate product shortcuts in the right rail (calendar lives in the header). */
export function headerCandidateSessionLinks(
  persona: MarketingPersona,
  hasSession: boolean,
): HeaderSessionProductLink[] {
  void persona;
  void hasSession;
  return [];
}

/**
 * One primary marketing CTA beside the logo.
 * Logged-out: persona-specific growth pill. Logged-in candidates: Demo pill is rendered directly in the header.
 */
export function headerGrowthLinksForPersona(
  persona: MarketingPersona,
  pathname: string,
  hasSession: boolean,
): HeaderGrowthLink[] {
  if (hasSession) return [];
  if (isMarketingHubPath(pathname)) return [];
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

export type HeaderSessionNavLink = { href: string; labelKey: TranslationKey };

/** Product shortcuts shown in the header while signed in (persona lane only). */
export function headerSessionNavLinks(
  persona: MarketingPersona,
  hasSession: boolean,
): HeaderSessionNavLink[] {
  if (!hasSession) return [];
  if (persona === "candidate") {
    return [
      { href: "/dashboard/calendar", labelKey: "dashboard.calendarLink" },
      { href: "/dashboard", labelKey: "nav.dashboard" },
      { href: "/dashboard/integrations", labelKey: "integrationsHub.title" },
      { href: "/demo", labelKey: "nav.demo" },
    ];
  }
  if (persona === "recruiter") {
    return [
      { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
      { href: "/recruiter/integrations/ats", labelKey: "integrationsHub.title" },
      { href: "/workspace/recruiter", labelKey: "workspace.recruiterHome" },
    ];
  }
  if (persona === "investor") {
    return [
      { href: "/workspace/investor", labelKey: "workspace.investorHome" },
      { href: "/investor/calculator", labelKey: "nav.calculatorInvestor" },
    ];
  }
  return [
    { href: "/for-companies", labelKey: "nav.forCompanies" },
    { href: "/company/integrations", labelKey: "integrationsHub.title" },
    { href: "/calculator/b2b", labelKey: "nav.calculatorB2bForCompanies" },
  ];
}

export function showCorporateNav(hasSession: boolean): boolean {
  return !hasSession;
}

/** Candidate lane: calendar + dashboard chrome in the header. */
export function showCandidateProductNav(persona: MarketingPersona): boolean {
  return persona === "candidate";
}

/** Logged-in candidate lane: show the always-on Demo pill beside the logo. */
export function showCandidateDemoNav(persona: MarketingPersona, hasSession: boolean): boolean {
  return hasSession && persona === "candidate";
}

export function logoutRedirectPath(persona: MarketingPersona): string {
  return LOGIN_PATH[persona];
}

export type HeaderAccountLink = { href: string; labelKey: TranslationKey; isLogout?: boolean };

export function headerAccountLinks(
  persona: MarketingPersona,
  hasSession: boolean,
): HeaderAccountLink[] {
  if (!hasSession) {
    return [
      { href: "/login?from=login", labelKey: "nav.login" },
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
  const common = ["/waitlist", "/", "/demo", "/faq", "/status", "/developers"];
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
    "/for-investors",
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
