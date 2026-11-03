/**
 * Preview → production isolation gate for Founder canary BFF.
 *
 * Temporary fail-closed safety: Vercel Preview must not mutate canary state
 * through a shared production API/DB until isolation is certified.
 * This is NOT proof of full environment isolation by itself.
 */

import { getUpstreamApiBase } from "@/lib/public-api-base";

/** Known production API host fingerprints (public hostnames only — never secrets). */
const BUILTIN_PRODUCTION_API_HOSTS = ["twin-production-bcd9.up.railway.app"] as const;

export type PreviewIsolationAudit = {
  vercel_preview: boolean;
  isolation_cert_present: boolean;
  upstream_configured: boolean;
  upstream_is_known_production_api: boolean;
  /** True only when preview mutations may forward upstream. */
  preview_mutations_allowed: boolean;
  /** Temporary guard active (preview + mutations blocked). */
  fail_closed_guard_active: boolean;
};

function hostnameFromUrl(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isVercelPreviewRuntime(): boolean {
  return (process.env.VERCEL_ENV || "").trim().toLowerCase() === "preview";
}

export function productionApiHostAllowlist(): Set<string> {
  const hosts = new Set<string>(BUILTIN_PRODUCTION_API_HOSTS);
  const extra = (
    process.env.FOUNDER_CANARY_PRODUCTION_API_HOSTS ||
    process.env.PRODUCTION_API_HOST ||
    ""
  )
    .split(/[,;\s]+/)
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const h of extra) {
    // Accept bare host or full URL fragments.
    const host = hostnameFromUrl(h) || h.replace(/^https?:\/\//i, "").split("/")[0];
    if (host) hosts.add(host);
  }
  return hosts;
}

export function upstreamIsKnownProductionApi(apiBase?: string | null): boolean {
  const host = hostnameFromUrl(apiBase ?? getUpstreamApiBase());
  if (!host) return false;
  return productionApiHostAllowlist().has(host);
}

export function previewIsolationCertPresent(): boolean {
  return (process.env.FOUNDER_CANARY_PREVIEW_ISOLATION_CERT || "").trim() === "1";
}

/**
 * Preview mutations require an explicit isolation certificate AND a non-production
 * upstream API. Certificate alone is never enough if upstream still points at prod.
 */
export function previewCanaryMutationsAllowed(): boolean {
  if (!isVercelPreviewRuntime()) return true;
  if (!previewIsolationCertPresent()) return false;
  const base = getUpstreamApiBase();
  if (!base) return false;
  if (upstreamIsKnownProductionApi(base)) return false;
  return true;
}

export function founderCanaryPreviewIsolationAudit(): PreviewIsolationAudit {
  const preview = isVercelPreviewRuntime();
  const cert = previewIsolationCertPresent();
  const base = getUpstreamApiBase();
  const upstreamConfigured = Boolean(base);
  const upstreamProd = upstreamIsKnownProductionApi(base);
  const allowed = previewCanaryMutationsAllowed();
  return {
    vercel_preview: preview,
    isolation_cert_present: cert,
    upstream_configured: upstreamConfigured,
    upstream_is_known_production_api: upstreamProd,
    preview_mutations_allowed: allowed,
    fail_closed_guard_active: preview && !allowed,
  };
}

export function assertPreviewCanaryMutationAllowed():
  | { ok: true }
  | { ok: false; detail: string; status: number } {
  if (previewCanaryMutationsAllowed()) return { ok: true };
  if (!isVercelPreviewRuntime()) return { ok: true };
  const audit = founderCanaryPreviewIsolationAudit();
  if (audit.upstream_is_known_production_api) {
    return {
      ok: false,
      status: 403,
      detail:
        "preview_canary_mutation_blocked: upstream API is a known production host — isolation unproven",
    };
  }
  if (!audit.isolation_cert_present) {
    return {
      ok: false,
      status: 403,
      detail:
        "preview_canary_mutation_blocked: FOUNDER_CANARY_PREVIEW_ISOLATION_CERT not set — fail-closed until staging isolation is verified",
    };
  }
  return {
    ok: false,
    status: 403,
    detail: "preview_canary_mutation_blocked: preview isolation requirements not met",
  };
}
