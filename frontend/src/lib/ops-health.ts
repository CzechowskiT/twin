import { getPublicApiBase } from "@/lib/public-api-base";

export type OpsHealth = {
  mail_configured: boolean;
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
};

/** Public deploy check — no auth; uses `GET /api/v1/health?ops=1`. */
export async function fetchOpsHealth(timeoutMs?: number): Promise<OpsHealth | null> {
  const base = getPublicApiBase();
  const url = base ? `${base}/api/v1/health?ops=1` : "/api/v1/health?ops=1";
  const controller = timeoutMs != null && timeoutMs > 0 ? new AbortController() : null;
  const timer =
    controller != null
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller?.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<OpsHealth>;
    return {
      mail_configured: Boolean(data.mail_configured),
      google_calendar_configured: Boolean(data.google_calendar_configured),
      microsoft_calendar_configured: Boolean(data.microsoft_calendar_configured),
    };
  } catch {
    return null;
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}
