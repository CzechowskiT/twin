import { apiFetch } from "@/lib/api";

export type LegalRegion = "EU_EEA" | "UK" | "US" | "CH" | "JP" | "CN" | "UAE" | "OTHER";

export type JurisdictionHint = {
  country_code: string | null;
  legal_region: string;
  source: string;
};

const LEGAL_REGIONS = new Set<LegalRegion>(["EU_EEA", "UK", "US", "CH", "JP", "CN", "UAE", "OTHER"]);

export function normalizeLegalRegion(value: string): LegalRegion {
  const v = value.toUpperCase();
  return LEGAL_REGIONS.has(v as LegalRegion) ? (v as LegalRegion) : "OTHER";
}

const hintCache = new Map<string, Promise<JurisdictionHint>>();

function hintCacheKey(opts?: { lat?: number; lon?: number }): string {
  if (opts?.lat != null && opts?.lon != null) {
    return `coords:${opts.lat.toFixed(4)},${opts.lon.toFixed(4)}`;
  }
  return "network";
}

/** Drop memoized hints (e.g. after a failed fetch) so the next call can retry. */
export function clearJurisdictionHintCache(): void {
  hintCache.clear();
}

/** Dedupe parallel calls (register notice + privacy page in one session). */
export function getJurisdictionHintCached(opts?: { lat?: number; lon?: number }): Promise<JurisdictionHint> {
  const key = hintCacheKey(opts);
  const existing = hintCache.get(key);
  if (existing) {
    return existing;
  }
  const p = fetchJurisdictionHint(opts).catch((err) => {
    hintCache.delete(key);
    throw err;
  });
  hintCache.set(key, p);
  return p;
}

/** Unauthenticated — used on register / consent before login. */
export async function fetchJurisdictionHint(opts?: { lat?: number; lon?: number }): Promise<JurisdictionHint> {
  const q = new URLSearchParams();
  if (opts?.lat != null && opts?.lon != null) {
    q.set("lat", opts.lat.toFixed(6));
    q.set("lon", opts.lon.toFixed(6));
  }
  const suffix = q.toString() ? `?${q}` : "";
  return apiFetch<JurisdictionHint>(`/api/v1/geo/jurisdiction-hint${suffix}`, { method: "GET" });
}
