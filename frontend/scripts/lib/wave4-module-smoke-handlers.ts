/**
 * Per-module Wave 4 Investor Complete prod smoke handlers.
 * Fail-closed without JWT / metrics exclusion.
 * Writes only when TWIN_PROD_SMOKE_WRITE=1 (NDA accept + evidence mark).
 * Never logs JWT. Never flips Pilot / Gate F / Launch. No real invites.
 */

export type SmokeFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ status: number; body: string }>;

export type ModuleSmokeContext = {
  fetchApi: SmokeFetch;
  headers: Record<string, string>;
  write: boolean;
  smokeSha?: string;
};

export type ModuleSmokeResult =
  | { module_id: string; ok: true }
  | { module_id: string; ok: false; reason: string };

export const WAVE4_SMOKEABLE_MODULES = [
  "investor_data_room",
  "investor_nda_acceptance",
  "investor_data_room_list",
  "investor_placement_readonly",
  "investor_trust_proof_readonly",
  "investor_login_gate",
  "board_implementation_tracker",
  "investor_metrics_wave4",
  "investor_roadmap_wave4",
  "investor_calculator_wave4",
  "investor_contact_wave4",
  "investor_product_proof_boundary",
] as const;

/** Empty after Final Pilot Launch Closure — former holds promoted to PASS in FE registry. */
export const WAVE4_POLICY_HELD_MODULES = [] as const;

export type Wave4SmokeableModule = (typeof WAVE4_SMOKEABLE_MODULES)[number];

const CURRENT_NDA_VERSION = "2026-07-22";

export function parseModuleSelection(raw: string | undefined): Wave4SmokeableModule[] {
  const value = (raw || "all").trim().toLowerCase();
  if (!value || value === "all" || value === "pending") {
    return [...WAVE4_SMOKEABLE_MODULES];
  }
  const wanted = new Set(value.split(",").map((s) => s.trim()).filter(Boolean));
  return WAVE4_SMOKEABLE_MODULES.filter((m) => wanted.has(m));
}

export function wave4SmokeFailClosedReasons(input: {
  hasJwt: boolean;
  metricsExcluded: boolean;
  enrollmentOn?: boolean;
  launchGo?: boolean;
  gateFOpen?: boolean;
  realInvites?: boolean;
}): string[] {
  const reasons: string[] = [];
  if (!input.hasJwt) reasons.push("no_jwt");
  if (!input.metricsExcluded) reasons.push("metrics_exclusion_required");
  if (input.enrollmentOn) reasons.push("enrollment_must_stay_off");
  if (input.launchGo) reasons.push("launch_must_stay_no_go");
  if (input.gateFOpen) reasons.push("gate_f_must_stay_pending");
  if (input.realInvites) reasons.push("real_invites_forbidden");
  return reasons;
}

async function jsonOrNull(body: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function requireWave4Status(
  ctx: ModuleSmokeContext,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; reason: string }> {
  const res = await ctx.fetchApi("/api/v1/platform/wave4/status", { headers: ctx.headers });
  if (res.status !== 200) return { ok: false, reason: `status ${res.status}` };
  const body = await jsonOrNull(res.body);
  if (!body) return { ok: false, reason: "status_parse" };
  if (body.live_claim !== false) return { ok: false, reason: "live_claim_must_be_false" };
  if (body.pilot_stance !== "READY_FOR_CONTROLLED_PILOT") return { ok: false, reason: "pilot_not_ready" };
  if (body.gate_f !== "PENDING") return { ok: false, reason: "gate_f_not_pending" };
  if (body.launch !== "NO-GO") return { ok: false, reason: "launch_not_no_go" };
  if (body.external_pilot_enrollment_enabled !== false) {
    return { ok: false, reason: "enrollment_enabled" };
  }
  if (body.ats_live_sync !== "BLOCKED" || body.microsoft_write !== "BLOCKED") {
    return { ok: false, reason: "provider_write_not_blocked" };
  }
  if (body.stripe_public !== "NOT_LIVE" || body.authologic_kyc !== "OFF") {
    return { ok: false, reason: "monetization_kyc_not_held" };
  }
  const smokeable = body.smokeable_module_ids;
  if (!Array.isArray(smokeable) || smokeable.length !== 12) {
    return { ok: false, reason: "smokeable_count" };
  }
  const held = body.held_module_ids;
  if (!Array.isArray(held) || held.length !== 3) {
    return { ok: false, reason: "held_count" };
  }
  return { ok: true, body };
}

async function markPassIfWrite(
  ctx: ModuleSmokeContext,
  moduleId: string,
): Promise<string | null> {
  if (!ctx.write) return null;
  const res = await ctx.fetchApi("/api/v1/platform/wave4/hard-live/evidence/mark", {
    method: "POST",
    headers: ctx.headers,
    body: JSON.stringify({
      module_id: moduleId,
      status: "PASS",
      smoke_sha: ctx.smokeSha ?? "unknown",
      notes: "Authenticated Wave 4 module prod smoke PASS",
    }),
  });
  if (res.status !== 200) return `mark ${res.status}`;
  return null;
}

export async function runModuleSmoke(
  moduleId: string,
  ctx: ModuleSmokeContext,
): Promise<ModuleSmokeResult> {
  try {
    switch (moduleId) {
      case "investor_login_gate":
      case "investor_metrics_wave4":
      case "investor_roadmap_wave4":
      case "investor_calculator_wave4":
      case "investor_contact_wave4":
      case "investor_product_proof_boundary": {
        const status = await requireWave4Status(ctx);
        if (!status.ok) return { module_id: moduleId, ok: false, reason: status.reason };
        const smokeable = status.body.smokeable_module_ids as string[];
        if (!smokeable.includes(moduleId)) {
          return { module_id: moduleId, ok: false, reason: "module_missing_from_smokeable" };
        }
        const holds = await ctx.fetchApi("/api/v1/platform/wave4/policy-holds", {
          headers: ctx.headers,
        });
        if (holds.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `policy-holds ${holds.status}` };
        }
        const holdsBody = await jsonOrNull(holds.body);
        if (!holdsBody || holdsBody.launch !== "NO-GO" || holdsBody.external_pilot_enrollment !== false) {
          return { module_id: moduleId, ok: false, reason: "policy_holds_invalid" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
        return { module_id: moduleId, ok: true };
      }
      case "investor_nda_acceptance": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const bad = await ctx.fetchApi("/api/v1/platform/wave4/nda/accept", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ nda_version: "old-version" }),
        });
        if (bad.status !== 422) {
          return { module_id: moduleId, ok: false, reason: `nda_mismatch_expected_422 got ${bad.status}` };
        }
        const ok = await ctx.fetchApi("/api/v1/platform/wave4/nda/accept", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ nda_version: CURRENT_NDA_VERSION }),
        });
        if (ok.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `nda_accept ${ok.status}` };
        }
        const body = await jsonOrNull(ok.body);
        if (!body || body.accepted !== true) {
          return { module_id: moduleId, ok: false, reason: "nda_accept_payload" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
        return { module_id: moduleId, ok: true };
      }
      case "investor_data_room":
      case "investor_data_room_list": {
        const nda = await ctx.fetchApi("/api/v1/platform/wave4/nda/status", {
          headers: ctx.headers,
        });
        if (nda.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `nda_status ${nda.status}` };
        }
        const docs = await ctx.fetchApi("/api/v1/platform/wave4/data-room/documents", {
          headers: ctx.headers,
        });
        if (docs.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `documents ${docs.status}` };
        }
        const body = await jsonOrNull(docs.body);
        if (!body || body.metadata_only_honesty !== true) {
          return { module_id: moduleId, ok: false, reason: "metadata_only_honesty" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
        return { module_id: moduleId, ok: true };
      }
      case "investor_placement_readonly": {
        const res = await ctx.fetchApi("/api/v1/platform/wave4/placement/summary", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `placement ${res.status}` };
        }
        const body = await jsonOrNull(res.body);
        if (!body || body.write_forbidden !== true) {
          return { module_id: moduleId, ok: false, reason: "placement_write_not_forbidden" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
        return { module_id: moduleId, ok: true };
      }
      case "investor_trust_proof_readonly": {
        const res = await ctx.fetchApi("/api/v1/platform/wave4/trust-proof/summary", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `trust ${res.status}` };
        }
        const body = await jsonOrNull(res.body);
        if (!body || body.readonly !== true) {
          return { module_id: moduleId, ok: false, reason: "trust_not_readonly" };
        }
        const counters = body.counters as Record<string, unknown> | undefined;
        if (
          counters?.external_attestations !== "HITL_QUEUE" &&
          counters?.external_attestations !== "HELD_POLICY"
        ) {
          return { module_id: moduleId, ok: false, reason: "attestations_not_held" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
        return { module_id: moduleId, ok: true };
      }
      case "board_implementation_tracker": {
        const res = await ctx.fetchApi("/api/v1/platform/wave4/board/readiness", {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `board ${res.status}` };
        }
        const body = await jsonOrNull(res.body);
        if (!body || body.launch !== "NO-GO" || body.live_claim !== false) {
          return { module_id: moduleId, ok: false, reason: "board_stance_invalid" };
        }
        if (body.wave4_held_modules !== 0) {
          return { module_id: moduleId, ok: false, reason: "board_held_count" };
        }
        const markErr = await markPassIfWrite(ctx, moduleId);
        if (markErr) return { module_id: moduleId, ok: false, reason: markErr };
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
