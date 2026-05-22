/** Public marketing audience — drives which `/for-*` landing we emphasize. */

export type MarketingPersona = "candidate" | "recruiter" | "company" | "investor";

export const MARKETING_PERSONAS: MarketingPersona[] = [
  "candidate",
  "recruiter",
  "company",
  "investor",
];

export const PERSONA_STORAGE_KEY = "twin_marketing_persona";

export const PERSONA_ROUTE: Record<MarketingPersona, `/${string}`> = {
  candidate: "/for-candidates",
  recruiter: "/for-recruiters",
  company: "/for-companies",
  investor: "/for-investors",
};

const PATH_TO_PERSONA: Record<string, MarketingPersona> = {
  "/for-candidates": "candidate",
  "/for-recruiters": "recruiter",
  "/for-companies": "company",
  "/for-investors": "investor",
};

export function marketingPersonaFromPath(pathname: string): MarketingPersona | null {
  const base = pathname.split("?")[0] ?? pathname;
  return PATH_TO_PERSONA[base] ?? null;
}

export function isMarketingPersona(value: string): value is MarketingPersona {
  return (MARKETING_PERSONAS as readonly string[]).includes(value);
}
