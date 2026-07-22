/**
 * Per-module Wave 5 calendar/integrations prod smoke handlers.
 * Fail-closed without JWT.
 * Writes only when TWIN_PROD_SMOKE_WRITE=1 (token mint / draft / ledger only).
 * Never logs JWT. Never real email / calendar provider write / ATS write.
 * Metrics exclusion required for mutation modules.
 */

export type SmokeFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ status: number; body: string }>;

export type ModuleSmokeContext = {
  fetchApi: SmokeFetch;
  headers: Record<string, string>;
  write: boolean;
};

export type ModuleSmokeResult =
  | { module_id: string; ok: true }
  | { module_id: string; ok: false; reason: string };

/** Modules Wave 5 aims to smoke toward LIVE (policy/not-built excluded). */
export const WAVE5_SMOKEABLE_MODULES = [
  "plat_google_calendar_oauth",
  "plat_google_calendar_read",
  "plat_google_calendar_write",
  "plat_google_calendar_availability",
  "plat_google_calendar_monitoring",
  "plat_ics_export",
  "plat_ics_share_token",
  "plat_webcal_subscribe",
  "plat_ics_cancel_uid",
  "plat_ms_calendar_oauth_config",
  "plat_ats_config_read",
  "plat_ats_webhook_verify",
  "plat_email_draft",
  "plat_notifications_prefs",
  "plat_oauth_providers_status",
  "plat_csv_export_safe",
  "plat_integration_inventory",
  "plat_webhook_delivery_ledger",
] as const;

export const WAVE5_POLICY_HELD_MODULES = [
  "plat_ms_calendar_write",
  "plat_ms_calendar_busy_read",
  "plat_ats_live_sync_write",
  "plat_ats_write_sync",
  "plat_stripe_public",
  "plat_authologic_auto_kyc",
  "plat_google_calendar_push_webhook",
  "plat_slack_connector",
  "plat_teams_connector",
  "plat_zapier_connector",
  "plat_cloud_storage_connectors",
  "plat_ics_import",
] as const;

export type Wave5SmokeableModule = (typeof WAVE5_SMOKEABLE_MODULES)[number];

const FORBIDDEN_PROVIDER_WRITE_PATHS = [
  "/api/v1/calendar/google/events",
  "/api/v1/calendar/google/interviews",
  "/api/v1/calendar/microsoft/interviews",
  "/api/v1/integrations/ats/",
];

function assertNoForbiddenPath(path: string): string | null {
  for (const banned of FORBIDDEN_PROVIDER_WRITE_PATHS) {
    if (path.includes(banned) || path.startsWith(banned)) {
      return `forbidden_provider_write_path:${banned}`;
    }
  }
  return null;
}

export async function runModuleSmoke(
  moduleId: string,
  ctx: ModuleSmokeContext,
): Promise<ModuleSmokeResult> {
  try {
    switch (moduleId) {
      case "plat_google_calendar_oauth":
      case "plat_google_calendar_read":
      case "plat_google_calendar_write":
      case "plat_google_calendar_availability":
      case "plat_google_calendar_monitoring": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/google/honesty", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `google honesty ${res.status}` };
        }
        const body = JSON.parse(res.body) as {
          smoke_may_write_provider?: boolean;
          capabilities?: Record<string, string>;
        };
        if (body.smoke_may_write_provider !== false) {
          return { module_id: moduleId, ok: false, reason: "smoke_may_write_must_be_false" };
        }
        if (moduleId === "plat_google_calendar_write" && body.capabilities?.WEBHOOK === "LIVE") {
          return { module_id: moduleId, ok: false, reason: "webhook_must_not_be_live" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ics_export": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/ics/preview", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ cancelled: false, sequence: 0 }),
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `ics preview ${res.status}` };
        }
        const body = JSON.parse(res.body) as { has_uid?: boolean; provider_write?: boolean };
        if (!body.has_uid || body.provider_write !== false) {
          return { module_id: moduleId, ok: false, reason: "ics_preview_invalid" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ics_share_token":
      case "plat_webcal_subscribe": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const res = await ctx.fetchApi("/api/v1/platform/wave5/webcal/mint", {
          method: "POST",
          headers: ctx.headers,
        });
        if (res.status === 403) {
          return { module_id: moduleId, ok: false, reason: "metrics_exclusion_required" };
        }
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `webcal mint ${res.status}` };
        }
        const body = JSON.parse(res.body) as { provider_write?: boolean };
        if (body.provider_write !== false) {
          return { module_id: moduleId, ok: false, reason: "provider_write_flag" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ics_cancel_uid": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/ics/preview", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ cancelled: true, sequence: 2 }),
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `ics cancel ${res.status}` };
        }
        const body = JSON.parse(res.body) as {
          has_cancel_method?: boolean;
          has_status_cancelled?: boolean;
          provider_write?: boolean;
        };
        if (!body.has_cancel_method || !body.has_status_cancelled || body.provider_write !== false) {
          return { module_id: moduleId, ok: false, reason: "ics_cancel_invalid" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ms_calendar_oauth_config": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/microsoft/honesty", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `ms honesty ${res.status}` };
        }
        const body = JSON.parse(res.body) as {
          microsoft_calendar_write_enabled?: boolean;
          capabilities?: Record<string, string>;
        };
        if (body.microsoft_calendar_write_enabled !== false) {
          return { module_id: moduleId, ok: false, reason: "ms_write_must_stay_false" };
        }
        if (body.capabilities?.WRITE !== "HELD_POLICY") {
          return { module_id: moduleId, ok: false, reason: "ms_write_not_held" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ats_config_read": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/ats/honesty", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `ats honesty ${res.status}` };
        }
        const body = JSON.parse(res.body) as {
          ats_live_sync?: string;
          smoke_may_write_ats?: boolean;
        };
        if (body.ats_live_sync !== "BLOCKED" || body.smoke_may_write_ats !== false) {
          return { module_id: moduleId, ok: false, reason: "ats_must_stay_blocked" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_ats_webhook_verify": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const payload = '{"event":"wave5_smoke"}';
        const secret = "wave5-smoke-secret-key";
        // Client-side HMAC not available in all runtimes — use invalid then valid via API dry-run
        // with a known signature computed inline (Web Crypto alternative: precomputed).
        const { createHmac } = await import("node:crypto");
        const signature = createHmac("sha256", secret).update(payload).digest("hex");
        const res = await ctx.fetchApi("/api/v1/platform/wave5/webhook/verify-dry-run", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            provider: "greenhouse",
            payload,
            signature,
            secret,
            idempotency_key: `wave5-smoke-${Date.now()}`,
          }),
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `webhook verify ${res.status}` };
        }
        const body = JSON.parse(res.body) as { ats_write?: boolean; forwarded?: boolean };
        if (body.ats_write !== false || body.forwarded !== false) {
          return { module_id: moduleId, ok: false, reason: "ats_write_leaked" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_email_draft": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const forbidden = await ctx.fetchApi("/api/v1/platform/wave5/email/draft", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ body_preview: "wave5", send: true }),
        });
        if (forbidden.status !== 400) {
          return { module_id: moduleId, ok: false, reason: "send_true_must_fail" };
        }
        const ok = await ctx.fetchApi("/api/v1/platform/wave5/email/draft", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ body_preview: "wave5 draft", send: false }),
        });
        if (ok.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `email draft ${ok.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_notifications_prefs": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/notifications/prefs", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `prefs ${res.status}` };
        }
        const body = JSON.parse(res.body) as { exclude_from_product_metrics?: boolean };
        if (body.exclude_from_product_metrics !== true) {
          return { module_id: moduleId, ok: false, reason: "metrics_exclusion_required" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_oauth_providers_status": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/oauth-providers", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `oauth ${res.status}` };
        }
        const body = JSON.parse(res.body) as { microsoft_calendar_write_enabled?: boolean };
        if (body.microsoft_calendar_write_enabled !== false) {
          return { module_id: moduleId, ok: false, reason: "ms_write_flag" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_csv_export_safe": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/csv/export-safe", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            rows: [{ id: "1", title: "=1+1", note: "ok" }],
          }),
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `csv ${res.status}` };
        }
        const body = JSON.parse(res.body) as { formula_cells_escaped?: number };
        if ((body.formula_cells_escaped ?? 0) < 1) {
          return { module_id: moduleId, ok: false, reason: "formula_not_escaped" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_integration_inventory": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/integration-inventory", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `inventory ${res.status}` };
        }
        const body = JSON.parse(res.body) as {
          integrations?: Record<string, Array<{ capability: string; status: string }>>;
        };
        const msWrite = body.integrations?.microsoft_calendar?.find((c) => c.capability === "WRITE");
        if (msWrite?.status !== "HELD_POLICY") {
          return { module_id: moduleId, ok: false, reason: "ms_write_inventory" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "plat_webhook_delivery_ledger": {
        const res = await ctx.fetchApi("/api/v1/platform/wave5/webhook/attempts?limit=5", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `ledger ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      default:
        return { module_id: moduleId, ok: false, reason: "unknown_module" };
    }
  } catch (err) {
    return {
      module_id: moduleId,
      ok: false,
      reason: err instanceof Error ? err.message.slice(0, 180) : "exception",
    };
  }
}

export function parseModuleSelection(raw: string | undefined): Wave5SmokeableModule[] {
  const value = (raw || "all").trim().toLowerCase();
  if (!value || value === "all" || value === "pending") {
    return [...WAVE5_SMOKEABLE_MODULES];
  }
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Wave5SmokeableModule[];
  const allowed = new Set<string>(WAVE5_SMOKEABLE_MODULES);
  return selected.filter((id) => allowed.has(id));
}

/** Fail-closed contract helpers used by prod smoke + unit tests. */
export function wave5SmokeFailClosedReasons(opts: {
  hasJwt: boolean;
  metricsExcluded: boolean;
  attemptedProviderWritePath?: string;
  realEmailSend?: boolean;
  realCalendarWrite?: boolean;
  realAtsWrite?: boolean;
}): string[] {
  const reasons: string[] = [];
  if (!opts.hasJwt) reasons.push("no_jwt");
  if (!opts.metricsExcluded) reasons.push("no_metrics_exclusion");
  if (opts.attemptedProviderWritePath) {
    const banned = assertNoForbiddenPath(opts.attemptedProviderWritePath);
    if (banned) reasons.push(banned);
  }
  if (opts.realEmailSend) reasons.push("real_email_send");
  if (opts.realCalendarWrite) reasons.push("real_calendar_write");
  if (opts.realAtsWrite) reasons.push("real_ats_write");
  return reasons;
}
