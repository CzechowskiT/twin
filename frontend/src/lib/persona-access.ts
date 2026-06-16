/**
 * Persona boundaries — candidate app vs recruiter vs company (employers) vs investor lanes.
 */

import {
  MARKETING_PERSONAS,
  PERSONA_ROUTE,
  type MarketingPersona,
} from "@/lib/marketing-persona";
import { COMPANY_ENTRY_DASHBOARD_ROUTE } from "@/lib/company-entry-navigation";
import { isPersonaModuleDeepLink } from "@/lib/persona-module-routes";
import { LOGIN_PATH, REGISTER_PATH, WORKSPACE_PATH } from "@/lib/persona-auth";
import type { TranslationKey } from "@/lib/i18n";
import { getSessionPersona } from "@/lib/session-persona";

export type PersonaAudience = MarketingPersona;

/** Canonical candidate calendar route — all candidate entry points must use this. */
export const CANDIDATE_CALENDAR_HREF = "/dashboard/calendar";

/** Routes that imply this persona when visited (syncs PersonaProvider). */
const PATH_IMPLIES_PERSONA: { prefix: string; persona: MarketingPersona }[] = [
  { prefix: "/for-candidates", persona: "candidate" },
  { prefix: "/dashboard/referrals", persona: "candidate" },
  { prefix: CANDIDATE_CALENDAR_HREF, persona: "candidate" },
  { prefix: "/dashboard", persona: "candidate" },
  { prefix: "/profile", persona: "candidate" },
  { prefix: "/onboarding", persona: "candidate" },
  { prefix: "/for-recruiters", persona: "recruiter" },
  { prefix: "/recruiter/employer", persona: "recruiter" },
  { prefix: "/recruiter", persona: "recruiter" },
  { prefix: "/company", persona: "company" },
  { prefix: "/for-companies", persona: "company" },
  { prefix: "/company", persona: "company" },
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
  { prefix: "/login/company", persona: "company" },
  { prefix: "/login/investor", persona: "investor" },
  { prefix: "/register/candidate", persona: "candidate" },
  { prefix: "/register/recruiter", persona: "recruiter" },
  { prefix: "/register/investor", persona: "investor" },
  { prefix: "/calculator/b2b", persona: "company" },
  { prefix: "/calculator", persona: "recruiter" },
];

/** Only these personas may access the path prefix (longest match wins). */
const PREFIX_ALLOWED: { prefix: string; allowed: readonly MarketingPersona[] }[] = [
  { prefix: CANDIDATE_CALENDAR_HREF, allowed: ["candidate"] },
  { prefix: "/recruiter/calendar", allowed: ["recruiter"] },
  { prefix: "/dashboard", allowed: ["candidate"] },
  { prefix: "/profile", allowed: ["candidate"] },
  { prefix: "/onboarding", allowed: ["candidate"] },
  { prefix: "/workspace/candidate", allowed: ["candidate"] },
  { prefix: "/workspace/recruiter", allowed: ["recruiter"] },
  { prefix: "/workspace/investor", allowed: ["investor"] },
  { prefix: "/workspace", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/investor/roadmap", allowed: ["investor"] },
  { prefix: "/investor/placement", allowed: ["investor"] },
  { prefix: "/investor/data-room", allowed: ["investor"] },
  { prefix: "/investor/metrics", allowed: ["investor"] },
  { prefix: "/investor/calculator", allowed: ["investor"] },
  { prefix: "/investor", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/for-investors", allowed: ["candidate", "recruiter", "company", "investor"] },
  { prefix: "/company", allowed: ["company", "recruiter"] },
  { prefix: "/calculator/b2b", allowed: ["company", "recruiter"] },
  { prefix: "/calculator", allowed: ["recruiter"] },
  { prefix: "/recruiter/employer", allowed: ["recruiter"] },
  { prefix: "/recruiter/integrations", allowed: ["recruiter"] },
  { prefix: "/recruiter", allowed: ["recruiter"] },
  { prefix: "/for-recruiters", allowed: ["recruiter"] },
  { prefix: "/company", allowed: ["company", "recruiter"] },
  { prefix: "/for-companies", allowed: ["company"] },
  { prefix: "/company", allowed: ["company", "recruiter"] },
  { prefix: "/for-candidates", allowed: ["candidate"] },
  { prefix: "/companies/signup", allowed: ["company"] },
  { prefix: "/demo", allowed: ["candidate", "recruiter", "investor", "company"] },
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
  "/investor",
  "/for-investors",
];

function isSessionNeutralPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === "/") return true;
  for (const prefix of SESSION_NEUTRAL_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/**
 * Session persona for gates — path-locked routes win over transient React state
 * so new tabs opened via cmd-click do not bounce to a generic hub.
 */
export function resolveEffectiveSessionPersona(
  pathname: string,
  marketingPersona: MarketingPersona,
): MarketingPersona {
  const pathLocked = sessionPersonaLockedByPath(pathname);
  if (pathLocked) return pathLocked;
  const session = getSessionPersona();
  if (session) return session;
  const fromPath = marketingPersonaFromPathExtended(pathname);
  if (fromPath) return fromPath;
  return marketingPersona;
}

/** Strict lane check for authenticated sessions — redirects cross-persona product routes. */
export function sessionPersonaHomeRedirect(
  pathname: string,
  persona: MarketingPersona,
): string | null {
  const path = normalizePath(pathname);
  if (isSessionNeutralPath(path)) return null;
  if (persona === "recruiter" && path.startsWith(CANDIDATE_CALENDAR_HREF)) {
    return "/recruiter/calendar";
  }
  if (isPathAllowedForPersona(pathname, persona)) return null;
  if (isPersonaModuleDeepLink(pathname, persona)) return null;
  return WORKSPACE_PATH[persona];
}

/** Header + momentum calendar tab — candidate live calendar vs recruiter roadmap placeholder. */
export function calendarNavHref(persona: MarketingPersona): string {
  if (persona === "recruiter") return "/recruiter/calendar";
  return candidateCalendarHref();
}

/** Single canonical href for all candidate calendar entry points. */
export function candidateCalendarHref(): string {
  return CANDIDATE_CALENDAR_HREF;
}

/**
 * When a route allows exactly one persona, the path locks the session lane on navigation.
 * Keeps header calendar links and guards aligned for candidate calendar.
 */
export function sessionPersonaLockedByPath(pathname: string): MarketingPersona | null {
  const rule = longestAllowedRule(normalizePath(pathname));
  if (!rule || rule.allowed.length !== 1) return null;
  return rule.allowed[0] ?? null;
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
  return [{ href: "/investor", labelKey: "nav.forInvestors", variant: "investor" }];
}

export type HeaderSessionNavLink = { href: string; labelKey: TranslationKey };

const SESSION_PANEL_PREFIXES: Partial<Record<string, readonly string[]>> = {
  "/workspace/recruiter": ["/workspace/recruiter", "/recruiter"],
  "/workspace/investor": ["/workspace/investor", "/investor"],
  [COMPANY_ENTRY_DASHBOARD_ROUTE]: ["/company"],
};

/** Logged-in home for the Panel tab (candidate dashboard vs persona workspace). */
export function sessionPanelHref(persona: MarketingPersona): string {
  if (persona === "candidate") return "/dashboard";
  if (persona === "company") return COMPANY_ENTRY_DASHBOARD_ROUTE;
  return WORKSPACE_PATH[persona];
}

export type MomentumRailCta = { href: string; labelKey: TranslationKey };

function momentumSecondaryCta(persona: MarketingPersona, hasSession: boolean): MomentumRailCta {
  if (persona === "candidate") {
    return { href: "/profile", labelKey: "site.momentumCtaProfile" };
  }
  if (persona === "recruiter") {
    return hasSession
      ? { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" }
      : { href: LOGIN_PATH.recruiter, labelKey: "site.momentumCtaLogin" };
  }
  if (persona === "investor") {
    return hasSession
      ? { href: "/investor/metrics", labelKey: "investorMetrics.title" }
      : { href: LOGIN_PATH.investor, labelKey: "site.momentumCtaLogin" };
  }
  return { href: REGISTER_PATH.company, labelKey: "site.footerCompanySignup" };
}

function defaultMomentumCtas(persona: MarketingPersona, hasSession: boolean): MomentumRailCta[] {
  return [
    { href: sessionPanelHref(persona), labelKey: "site.momentumCtaWorkspace" },
    momentumSecondaryCta(persona, hasSession),
  ];
}

/** Persona-aware shortcuts for the global momentum rail (footer of `Shell`). */
export function momentumRailCtas(
  pathname: string,
  variant: "app" | "marketing",
  persona: MarketingPersona,
  hasSession: boolean,
): MomentumRailCta[] {
  if (variant === "marketing") {
    return [
      { href: "/register", labelKey: "site.momentumCtaRegister" },
      { href: "/login", labelKey: "site.momentumCtaLogin" },
      { href: "/faq", labelKey: "site.momentumCtaFaq" },
    ];
  }
  if (pathname.startsWith("/admin")) {
    return [{ href: "/", labelKey: "site.momentumCtaHome" }];
  }
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback")
  ) {
    return [
      { href: "/faq", labelKey: "site.momentumCtaFaq" },
      pathname.startsWith("/login")
        ? { href: "/register", labelKey: "site.momentumCtaRegister" }
        : { href: "/login", labelKey: "site.momentumCtaLogin" },
    ];
  }
  if (pathname.startsWith("/recruiter/calendar")) {
    return [
      { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
      { href: "/recruiter/jobs", labelKey: "recruiterJobs.title" },
    ];
  }
  if (pathname.startsWith(CANDIDATE_CALENDAR_HREF)) {
    return [
      { href: "/dashboard", labelKey: "site.momentumCtaWorkspace" },
      { href: "/profile", labelKey: "site.momentumCtaProfile" },
    ];
  }
  if (pathname.startsWith("/dashboard")) {
    if (persona !== "candidate") {
      return defaultMomentumCtas(persona, hasSession);
    }
    return [
      { href: "/profile", labelKey: "site.momentumCtaProfile" },
      { href: "/dashboard/billing", labelKey: "dashboard.billingLink" },
    ];
  }
  if (pathname.startsWith("/profile")) {
    if (persona !== "candidate") {
      return defaultMomentumCtas(persona, hasSession);
    }
    return [
      { href: "/dashboard", labelKey: "site.momentumCtaWorkspace" },
      { href: "/dashboard/billing", labelKey: "dashboard.billingLink" },
    ];
  }
  if (pathname.startsWith("/workspace/recruiter") || pathname.startsWith("/recruiter")) {
    return [
      { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
      { href: "/for-recruiters", labelKey: "nav.forRecruiters" },
    ];
  }
  if (pathname.startsWith("/workspace/investor") || pathname.startsWith("/investor")) {
    return [
      { href: "/investor/metrics", labelKey: "investorMetrics.title" },
      { href: "/for-investors", labelKey: "nav.forInvestors" },
    ];
  }
  if (pathname.startsWith("/company") || pathname === "/for-companies") {
    return [
      { href: COMPANY_ENTRY_DASHBOARD_ROUTE, labelKey: "site.momentumCtaWorkspace" },
      { href: "/company/talent-pool", labelKey: "companyTalentPool.navLink" },
      { href: "/for-companies", labelKey: "nav.forCompanies" },
    ];
  }
  return defaultMomentumCtas(persona, hasSession);
}

/** Kalendarz | Panel | Demo — calendar href is persona-aware (recruiter → roadmap placeholder). */
export function headerSessionNavLinks(
  persona: MarketingPersona,
  hasSession: boolean,
): HeaderSessionNavLink[] {
  if (!hasSession) return [];
  return [
    { href: calendarNavHref(persona), labelKey: "dashboard.calendarLink" },
    { href: sessionPanelHref(persona), labelKey: "nav.dashboard" },
    { href: "/demo", labelKey: "nav.demo" },
  ];
}

/** Whether a signed-in header nav item matches the current route (incl. dashboard section hashes). */
export function isSessionNavLinkActive(
  pathname: string,
  locationHash: string,
  href: string,
): boolean {
  const [path, fragment] = href.split("#");
  const base = path || "/";
  if (fragment) {
    return pathname === base && locationHash === `#${fragment}`;
  }
  if (base === "/demo") {
    return pathname === "/demo" || pathname.startsWith("/demo/");
  }
  if (base === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/calendar"))
    );
  }
  if (base === CANDIDATE_CALENDAR_HREF) {
    return pathname === CANDIDATE_CALENDAR_HREF || pathname.startsWith(`${CANDIDATE_CALENDAR_HREF}/`);
  }
  if (base === "/recruiter/calendar") {
    return pathname === "/recruiter/calendar" || pathname.startsWith("/recruiter/calendar/");
  }
  const panelPrefixes = SESSION_PANEL_PREFIXES[base];
  if (panelPrefixes) {
    return panelPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function showCorporateNav(hasSession: boolean): boolean {
  return !hasSession;
}

export type HeaderMarketingLaneLink = {
  href: string;
  labelKey: TranslationKey;
  persona?: MarketingPersona;
};

/** Logged-out marketing chrome: Kandydat · Rekruter · Firmy · Demo (flat links, not a dropdown). */
export function headerMarketingLaneLinks(): HeaderMarketingLaneLink[] {
  return [
    { href: PERSONA_ROUTE.candidate, labelKey: "nav.personaCandidate", persona: "candidate" },
    { href: PERSONA_ROUTE.recruiter, labelKey: "nav.personaRecruiter", persona: "recruiter" },
    { href: PERSONA_ROUTE.company, labelKey: "nav.personaCompany", persona: "company" },
    { href: "/demo", labelKey: "nav.demo" },
  ];
}

/** Unified login hub — role choice before persona-specific forms. */
export function headerMarketingLoginHref(persona: MarketingPersona): string {
  void persona;
  return "/login";
}

/** Flat persona lane nav replaces corporate hub links on public marketing chrome. */
export function showMarketingPersonaNav(hasSession: boolean, marketingChrome: boolean): boolean {
  return marketingChrome && !hasSession;
}

/** Candidate lane: calendar + dashboard chrome in the header. */
export function showCandidateProductNav(persona: MarketingPersona): boolean {
  return persona === "candidate";
}

/** Demo beside the logo — logged-out candidates only; signed-in users get Demo in the center tab strip. */
export function showCandidateDemoNav(persona: MarketingPersona, hasSession: boolean): boolean {
  return !hasSession && persona === "candidate";
}

export function logoutRedirectPath(persona: MarketingPersona): string {
  void persona;
  return "/login";
}

export type HeaderAccountLink = { href: string; labelKey: TranslationKey; isLogout?: boolean };

export function headerAccountLinks(
  persona: MarketingPersona,
  hasSession: boolean,
  opts?: { marketingChrome?: boolean },
): HeaderAccountLink[] {
  if (!hasSession) {
    const loginHref = opts?.marketingChrome
      ? headerMarketingLoginHref(persona)
      : "/login?from=login";
    return [
      { href: loginHref, labelKey: "nav.login" },
      { href: "/register", labelKey: "nav.register" },
    ];
  }
  return [
    { href: sessionPanelHref(persona), labelKey: "nav.dashboard" },
    { href: "#", labelKey: "dashboard.logout", isLogout: true },
  ];
}

export function footerExploreHrefsForPersona(persona: MarketingPersona): string[] {
  const common = ["/waitlist", "/", "/demo", "/faq", "/status", "/developers"];
  if (persona === "company") {
    return [
      ...common,
      "/for-companies",
      "/calculator/b2b",
      "/login/company",
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
