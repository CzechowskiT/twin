import {
  isFetchTimeoutError,
  isLikelyBrowserNetworkFailureMessage,
  stripRequestIdFromUserMessage,
} from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";

/** Browser login must fail fast — never leave “Logowanie…” spinning on a hung proxy/upstream. */
export const LOGIN_REQUEST_TIMEOUT_MS = 10_000;

/** Support/diagnostic codes for login failures (never shown with passwords). */
export type LoginDiagnosticCode =
  | "AUTH_TIMEOUT"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_BAD_RESPONSE"
  | "AUTH_RATE_LIMITED";

export type LoginErrorTranslationKey =
  | "login.invalidCredentials"
  | "login.rateLimited"
  | "login.temporarilyUnavailable"
  | "login.configMissingApi"
  | "login.malformedResponse";

function normalizeApiMessage(raw: string): string {
  return stripRequestIdFromUserMessage(raw).trim();
}

/** Map API / network failures to user-safe login copy (no passwords, no raw stack traces). */
export function resolveLoginDiagnosticCode(err: unknown, apiMessage?: string): LoginDiagnosticCode {
  const key = resolveLoginErrorKey(err, apiMessage);
  if (key === "login.invalidCredentials") return "AUTH_INVALID_CREDENTIALS";
  if (key === "login.rateLimited") return "AUTH_RATE_LIMITED";
  if (key === "login.malformedResponse") return "AUTH_BAD_RESPONSE";
  if (key === "login.temporarilyUnavailable" && isFetchTimeoutError(err)) return "AUTH_TIMEOUT";
  const msg = (apiMessage ?? (err instanceof Error ? err.message : "")).toLowerCase();
  if (msg.includes("timed out") || msg.includes("timeout")) return "AUTH_TIMEOUT";
  return "AUTH_BAD_RESPONSE";
}

/** Map API / network failures to user-safe login copy (no passwords, no raw stack traces). */
export function resolveLoginErrorKey(err: unknown, apiMessage?: string): LoginErrorTranslationKey {
  const msg = normalizeApiMessage(
    apiMessage ?? (err instanceof Error ? err.message : String(err ?? "")),
  );
  const lower = msg.toLowerCase();

  if (
    msg.includes("Missing API base URL") ||
    msg.includes("TWIN_API_BASE_URL") ||
    msg.includes("NEXT_PUBLIC_API_URL")
  ) {
    return "login.configMissingApi";
  }

  if (isFetchTimeoutError(err) || lower.includes("timed out") || lower.includes("timeout")) {
    return "login.temporarilyUnavailable";
  }

  if (isLikelyBrowserNetworkFailureMessage(msg) || lower.includes("cannot reach api")) {
    return "login.temporarilyUnavailable";
  }

  if (
    lower.includes("429") ||
    lower.includes("too many login") ||
    lower.includes("too many attempts") ||
    lower.includes("rate limit") ||
    lower.includes("exceeded")
  ) {
    return "login.rateLimited";
  }

  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("invalid credentials") ||
    lower.includes("could not validate credentials") ||
    lower.includes("privacy and consent setup incomplete")
  ) {
    return "login.invalidCredentials";
  }

  if (
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable")
  ) {
    return "login.temporarilyUnavailable";
  }

  return "login.temporarilyUnavailable";
}

export function loginErrorTranslationKeyFromStatus(status: number, detail?: string): LoginErrorTranslationKey {
  if (status === 401 || status === 403) return "login.invalidCredentials";
  if (status === 429) return "login.rateLimited";
  if (status === 503 && detail && normalizeApiMessage(detail).includes("Missing API base URL")) {
    return "login.configMissingApi";
  }
  if (status >= 500 || status === 502 || status === 504) return "login.temporarilyUnavailable";
  return resolveLoginErrorKey(new Error(detail ?? `HTTP ${status}`), detail);
}

/** Guard token shape before persisting session (malformed 200 must not redirect silently). */
export function parseLoginAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const token = (payload as { access_token?: unknown }).access_token;
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isLoginErrorKey(key: TranslationKey): key is LoginErrorTranslationKey {
  return (
    key === "login.invalidCredentials" ||
    key === "login.rateLimited" ||
    key === "login.temporarilyUnavailable" ||
    key === "login.configMissingApi" ||
    key === "login.malformedResponse"
  );
}
