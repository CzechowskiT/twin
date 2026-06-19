/** Safe persistence fetch — live API with demo fallback on auth errors. */

import { apiFetch } from "@/lib/api";

export type SafePersistenceSource = "live" | "demo";

export type SafePersistenceResult<T> = {
  source: SafePersistenceSource;
  data: T;
};

type ListPayload = { items?: unknown[] };

export async function fetchSafePersistenceList<T extends ListPayload>(
  apiPath: string,
  demo: T,
): Promise<SafePersistenceResult<T>> {
  try {
    const live = await apiFetch<T>(apiPath, { preserveSessionOnUnauthorized: true });
    if (live && Array.isArray(live.items)) {
      return { source: "live", data: live };
    }
  } catch {
    /* demo fallback — no session or API unavailable */
  }
  return { source: "demo", data: demo };
}
