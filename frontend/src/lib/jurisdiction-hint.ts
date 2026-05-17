import { apiFetch } from "@/lib/api";

export type LegalRegion = "EU_EEA" | "UK" | "US" | "CH" | "JP" | "CN" | "OTHER";

export type JurisdictionHint = {
  country_code: string | null;
  legal_region: string;
  source: string;
};

const LEGAL_REGIONS = new Set<LegalRegion>(["EU_EEA", "UK", "US", "CH", "JP", "CN", "OTHER"]);

export function normalizeLegalRegion(value: string): LegalRegion {
  const v = value.toUpperCase();
  return LEGAL_REGIONS.has(v as LegalRegion) ? (v as LegalRegion) : "OTHER";
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
