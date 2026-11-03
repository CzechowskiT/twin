import { apiFetch } from "@/lib/api";

export const DASHBOARD_WEBCAL_STORAGE_KEY = "twin_dashboard_webcal_url";

export type WebcalFeedOut = {
  token: string;
  expires_at: string;
  subscribe_path: string;
  webcal_url: string;
};

export function webcalToHttps(webcalUrl: string): string {
  return webcalUrl.replace(/^webcal:\/\//i, "https://");
}

/** Opens the native subscribe flow (Apple Calendar, Outlook, Google via URL). */
export function openWebcalSubscribe(webcalUrl: string): void {
  const anchor = document.createElement("a");
  anchor.href = webcalUrl;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function persistWebcalUrl(url: string): void {
  try {
    sessionStorage.setItem(DASHBOARD_WEBCAL_STORAGE_KEY, url.trim());
  } catch {
    /* ignore */
  }
}

export function readStoredWebcalUrl(): string | null {
  try {
    const stored = sessionStorage.getItem(DASHBOARD_WEBCAL_STORAGE_KEY);
    return stored?.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

export async function mintWebcalFeed(authToken: string): Promise<WebcalFeedOut> {
  return apiFetch<WebcalFeedOut>(
    "/api/v1/calendar/me/webcal-token",
    { method: "POST", body: "{}" },
    authToken,
  );
}

export type IcsImportOut = {
  imported: number;
  created: number;
  updated: number;
  provider_write: boolean;
};

/** Import VEVENT holds from ICS text — local busy blocks only (no Google/MS write). */
export async function importIcsText(authToken: string, icsText: string): Promise<IcsImportOut> {
  return apiFetch<IcsImportOut>(
    "/api/v1/calendar/me/ics/import",
    { method: "POST", body: JSON.stringify({ ics_text: icsText }) },
    authToken,
  );
}

/** Mint (or refresh) feed URL and trigger calendar-app subscribe in one gesture. */
export async function mintAndOpenWebcalSubscribe(authToken: string): Promise<WebcalFeedOut> {
  const out = await mintWebcalFeed(authToken);
  persistWebcalUrl(out.webcal_url);
  openWebcalSubscribe(out.webcal_url);
  return out;
}
