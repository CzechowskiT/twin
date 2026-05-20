import { getPublicApiBase } from "@/lib/public-api-base";

export type OpsHealth = {
  mail_configured: boolean;
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
};

/** Public deploy check — no auth; uses `GET /api/v1/health?ops=1`. */
export async function fetchOpsHealth(): Promise<OpsHealth | null> {
  const base = getPublicApiBase();
  const url = base ? `${base}/api/v1/health?ops=1` : "/api/v1/health?ops=1";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<OpsHealth>;
    return {
      mail_configured: Boolean(data.mail_configured),
      google_calendar_configured: Boolean(data.google_calendar_configured),
      microsoft_calendar_configured: Boolean(data.microsoft_calendar_configured),
    };
  } catch {
    return null;
  }
}
