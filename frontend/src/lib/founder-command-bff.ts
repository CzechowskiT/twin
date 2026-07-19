/**
 * Server-only helpers for Founder Command Center BFF.
 * FOUNDER_COMMAND_TOKEN must never reach the browser.
 */

export function founderCommandUpstreamToken(): string | null {
  const token =
    process.env.FOUNDER_COMMAND_TOKEN?.trim() ||
    process.env.OPS_ADMIN_TOKEN?.trim() ||
    process.env.BETA_ADMIN_TOKEN?.trim() ||
    "";
  return token || null;
}

/** Comma/semicolon/whitespace-separated founder emails (case-insensitive). */
export function parseFounderAllowlist(raw: string | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const part of (raw ?? "").split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email.includes("@")) out.add(email);
  }
  return out;
}

export function founderAllowlistFromEnv(): Set<string> {
  return parseFounderAllowlist(process.env.FOUNDER_COMMAND_ALLOWLIST);
}

export function extractBearerToken(authorization: string | null | undefined): string | null {
  const raw = (authorization ?? "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  const token = raw.slice(7).trim();
  return token || null;
}

export function isEmailInAllowlist(email: string, allowlist: Set<string>): boolean {
  return allowlist.has(email.trim().toLowerCase());
}
