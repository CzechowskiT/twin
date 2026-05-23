/** Recruiter batch inbox — session, invite URL params, and display names (no "slug" in UI). */

export const RECRUITER_INBOX_STORAGE_TOKEN = "twin_recruiter_inbox_token";
export const RECRUITER_INBOX_STORAGE_COMPANY = "twin_recruiter_company_slug";

/** Investor demo seed default (`scripts/seed-investor-demo.py`). */
export const RECRUITER_DEMO_COMPANY_SLUG = "nova-hiring-pl";

export type RecruiterCompanyOption = {
  slug: string;
  label: string;
};

export const RECRUITER_DEMO_COMPANIES: RecruiterCompanyOption[] = [
  { slug: RECRUITER_DEMO_COMPANY_SLUG, label: "Nova Hiring PL" },
];

export function slugifyCompany(name: string): string {
  const s = (name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (s || "company").slice(0, 80);
}

export function companySlugToLabel(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  const demo = RECRUITER_DEMO_COMPANIES.find((c) => c.slug === trimmed);
  if (demo) return demo.label;
  return trimmed
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseRecruiterInviteSearchParams(params: URLSearchParams): {
  token: string;
  companySlug: string;
} {
  const token = params.get("token")?.trim() ?? "";
  const companySlug =
    params.get("company_slug")?.trim() ||
    params.get("company")?.trim() ||
    "";
  return { token, companySlug };
}

export function readRecruiterInboxSession(): { token: string; companySlug: string } {
  if (typeof window === "undefined") return { token: "", companySlug: "" };
  try {
    return {
      token: sessionStorage.getItem(RECRUITER_INBOX_STORAGE_TOKEN)?.trim() ?? "",
      companySlug: sessionStorage.getItem(RECRUITER_INBOX_STORAGE_COMPANY)?.trim() ?? "",
    };
  } catch {
    return { token: "", companySlug: "" };
  }
}

export function writeRecruiterInboxSession(token: string, companySlug: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RECRUITER_INBOX_STORAGE_TOKEN, token.trim());
    sessionStorage.setItem(RECRUITER_INBOX_STORAGE_COMPANY, companySlug.trim());
  } catch {
    /* ignore */
  }
}

export function readRecruiterInboxDemoEnv(): { token: string; companySlug: string } {
  const companySlug =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_RECRUITER_INBOX_DEMO_COMPANY?.trim()) ||
    "";
  const token =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_RECRUITER_INBOX_DEMO_TOKEN?.trim()) ||
    "";
  return { token, companySlug };
}

export function mergeCompanyOptions(
  ...sources: (RecruiterCompanyOption | string | null | undefined)[]
): RecruiterCompanyOption[] {
  const bySlug = new Map<string, string>();
  for (const src of RECRUITER_DEMO_COMPANIES) {
    bySlug.set(src.slug, src.label);
  }
  for (const raw of sources) {
    if (!raw) continue;
    if (typeof raw === "string") {
      const slug = slugifyCompany(raw);
      if (!slug) continue;
      const label = companySlugToLabel(slug);
      if (!bySlug.has(slug)) bySlug.set(slug, label);
      continue;
    }
    if (raw.slug && !bySlug.has(raw.slug)) bySlug.set(raw.slug, raw.label);
  }
  return [...bySlug.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function recruiterInboxQuery(token: string, companySlug: string): URLSearchParams {
  return new URLSearchParams({ company_slug: companySlug.trim(), token: token.trim() });
}

export function resolveCompanySlugFromRaw(raw: string, knownSlugs: Set<string>): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (knownSlugs.has(trimmed)) return trimmed;
  return slugifyCompany(trimmed);
}
