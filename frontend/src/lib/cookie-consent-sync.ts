import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { CookieConsentRecord } from "@/lib/cookie-consent";
import { safeStorage } from "@/lib/safe-storage";

const VISITOR_ID_KEY = "twin_cookie_visitor_id";

function visitorId(): string {
  let id = safeStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `cv_${Math.random().toString(36).slice(2, 14)}`;
    safeStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

/** Append-only audit on API; best-effort, never blocks the banner. */
export async function syncCookieConsentToServer(consent: CookieConsentRecord): Promise<void> {
  if (typeof window === "undefined") return;
  const token = getToken();
  try {
    await apiFetch<{ ok: boolean }>(
      "/api/v1/consent/cookies",
      {
        method: "POST",
        body: JSON.stringify({
          version: consent.version,
          analytics: consent.analytics,
          marketing: consent.marketing,
          decided_at: consent.decidedAt,
          visitor_id: visitorId(),
        }),
      },
      token,
    );
  } catch {
    /* optional audit trail */
  }
}
