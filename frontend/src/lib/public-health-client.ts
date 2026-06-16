import { createRequestDeduper } from "@/lib/create-request-deduper";

const PUBLIC_HEALTH_TTL_MS = 45_000;

export const publicHealthDeduper = createRequestDeduper(PUBLIC_HEALTH_TTL_MS);

/** Deduped `GET /api/public-health` for status, investor, and OAuth fallback surfaces. */
export async function fetchPublicHealthJson<T = Record<string, unknown>>(
  init?: RequestInit,
): Promise<T> {
  return publicHealthDeduper("public-health", async () => {
    const res = await fetch("/api/public-health", { cache: "no-store", ...init });
    if (!res.ok) throw new Error(`public-health:${res.status}`);
    return (await res.json()) as T;
  });
}
