/**
 * Per-module Wave 1 candidate prod smoke handlers.
 * Fail-closed without JWT. Writes only when TWIN_PROD_SMOKE_WRITE=1.
 * Never logs JWT. Excluded-metrics accounts only.
 */

export type SmokeFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ status: number; body: string }>;

export type ModuleSmokeContext = {
  fetchApi: SmokeFetch;
  headers: Record<string, string>;
  write: boolean;
  candidateId: number;
};

export type ModuleSmokeResult = { module_id: string; ok: true } | { module_id: string; ok: false; reason: string };

async function cancelPrivacy(fetchApi: SmokeFetch, headers: Record<string, string>, id: number): Promise<void> {
  await fetchApi(`/api/v1/candidates/me/privacy-requests/${id}/cancel`, {
    method: "POST",
    headers,
  });
}

async function postPrivacy(
  ctx: ModuleSmokeContext,
  requestType: string,
  note: string,
): Promise<{ id: number }> {
  const key = `wave1-mod-${requestType}-${Date.now()}`;
  const created = await ctx.fetchApi("/api/v1/candidates/me/privacy-requests", {
    method: "POST",
    headers: ctx.headers,
    body: JSON.stringify({
      request_type: requestType,
      payload: { note, source: "wave1_module_prod_smoke" },
      idempotency_key: key,
    }),
  });
  if (created.status !== 201) {
    throw new Error(`privacy ${requestType} → ${created.status}: ${created.body.slice(0, 180)}`);
  }
  const id = (JSON.parse(created.body) as { id: number }).id;
  await cancelPrivacy(ctx.fetchApi, ctx.headers, id);
  return { id };
}

export const WAVE1_SMOKEABLE_MODULES = [
  "candidate_export_preview",
  "candidate_identity_verification",
  "cand_notifications",
  "cand_preferences",
  "cand_feedback",
  "cand_match_explanation",
] as const;

/** Policy-held: PROFILE_EDIT requires Standard+ (Stripe not public) — not Wave 1 engineering LIVE. */
export const WAVE1_POLICY_HELD_CV_MODULES = ["cand_cv_import", "cand_cv_parsing"] as const;

export type Wave1SmokeableModule = (typeof WAVE1_SMOKEABLE_MODULES)[number];

export async function runModuleSmoke(
  moduleId: string,
  ctx: ModuleSmokeContext,
): Promise<ModuleSmokeResult> {
  try {
    switch (moduleId) {
      case "candidate_export_preview": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const exp = await ctx.fetchApi("/api/v1/candidates/me/export.json", { headers: ctx.headers });
        if (exp.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `export.json ${exp.status}` };
        }
        const payload = JSON.parse(exp.body) as { user?: unknown; candidate?: unknown };
        if (!payload.user && !payload.candidate) {
          return { module_id: moduleId, ok: false, reason: "export.json missing user/candidate" };
        }
        await postPrivacy(ctx, "export", "wave1 export intake — no outbound");
        const intake = await ctx.fetchApi("/api/v1/export-requests", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            request_type: "candidate_export_intake",
            candidate_id: String(ctx.candidateId),
            status: "queued_for_ops_intake",
          }),
        });
        if (intake.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `export-requests ${intake.status}` };
        }
        const row = JSON.parse(intake.body) as { legal_claim: boolean; status: string };
        if (row.legal_claim || row.status === "fulfilled") {
          return { module_id: moduleId, ok: false, reason: "illegal fulfillment claim" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "candidate_identity_verification": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const cfg = await ctx.fetchApi("/api/v1/kyc/authologic/configured", { headers: ctx.headers });
        if (cfg.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `kyc configured ${cfg.status}` };
        }
        const configured = (JSON.parse(cfg.body) as { configured: boolean }).configured;
        const st = await ctx.fetchApi("/api/v1/kyc/status", { headers: ctx.headers });
        if (st.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `kyc status ${st.status}` };
        }
        // Never start Authologic in smoke — provider remains policy-held.
        if (configured) {
          // Read-only OK; still exercise manual review intake only.
        }
        await postPrivacy(ctx, "identity_review", "wave1 manual identity review — no fake KYC");
        return { module_id: moduleId, ok: true };
      }
      case "cand_notifications": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const before = await ctx.fetchApi("/api/v1/candidates/me/trust/live-bundle", {
          headers: ctx.headers,
        });
        if (before.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `bundle ${before.status}` };
        }
        const prefs = (
          JSON.parse(before.body) as {
            communication_preferences: {
              email_product_updates: boolean;
              email_interview_reminders: boolean;
            };
          }
        ).communication_preferences;
        const patch = await ctx.fetchApi("/api/v1/auth/me/notification-preferences", {
          method: "PATCH",
          headers: ctx.headers,
          body: JSON.stringify({
            email_product_updates: !prefs.email_product_updates,
            email_interview_reminders: prefs.email_interview_reminders,
          }),
        });
        if (patch.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `notif patch ${patch.status}` };
        }
        // Restore
        await ctx.fetchApi("/api/v1/auth/me/notification-preferences", {
          method: "PATCH",
          headers: ctx.headers,
          body: JSON.stringify({
            email_product_updates: prefs.email_product_updates,
            email_interview_reminders: prefs.email_interview_reminders,
          }),
        });
        return { module_id: moduleId, ok: true };
      }
      case "cand_preferences": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const list = await ctx.fetchApi("/api/v1/candidate-visibility-preferences", {
          headers: ctx.headers,
        });
        if (list.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `vis list ${list.status}` };
        }
        const created = await ctx.fetchApi("/api/v1/candidate-visibility-preferences", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            candidate_id: String(ctx.candidateId),
            profile_visibility: "private",
            cv_visibility: "private",
            match_visibility: "private",
            company_visibility: "hidden",
            communication_preference: "no_outreach",
          }),
        });
        if (created.status !== 201 && created.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `vis create ${created.status}` };
        }
        const id = (JSON.parse(created.body) as { id: number }).id;
        const patched = await ctx.fetchApi(`/api/v1/candidate-visibility-preferences/${id}`, {
          method: "PATCH",
          headers: ctx.headers,
          body: JSON.stringify({ profile_visibility: "private" }),
        });
        if (patched.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `vis patch ${patched.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "cand_cv_import":
      case "cand_cv_parsing": {
        // Honest gate: Free/Standby cannot mutate CV until Standard+ (Stripe policy hold).
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const form = new FormData();
        const blob = new Blob(
          ["Wave1 Smoke Candidate\nSkills: TypeScript, Python\nExperience: 3 years software engineer\n"],
          { type: "text/plain" },
        );
        form.append("file", blob, "wave1-smoke-cv.txt");
        form.append("processing_consent", "true");
        const upload = await ctx.fetchApi("/api/v1/candidates/me/cv", {
          method: "POST",
          headers: {
            Authorization: ctx.headers.Authorization,
            "X-Locale": ctx.headers["X-Locale"] ?? "en",
          },
          body: form,
        });
        if (upload.status === 403 && upload.body.includes("paywall")) {
          return {
            module_id: moduleId,
            ok: false,
            reason: "HELD_POLICY:PROFILE_EDIT_REQUIRES_STANDARD",
          };
        }
        if (upload.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `cv upload ${upload.status}: ${upload.body.slice(0, 120)}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "cand_feedback": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const matches = await ctx.fetchApi("/api/v1/candidates/me/matches?limit=5&min_score=0", {
          headers: ctx.headers,
        });
        if (matches.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `matches ${matches.status}` };
        }
        const items = (JSON.parse(matches.body) as { items?: Array<{ job_id: number }> }).items ?? [];
        if (items.length === 0) {
          // Read path OK; mutation needs a job — list endpoint proves surface.
          const listed = await ctx.fetchApi("/api/v1/candidates/me/match-feedback", {
            headers: ctx.headers,
          });
          if (listed.status !== 200) {
            return { module_id: moduleId, ok: false, reason: `feedback list ${listed.status}` };
          }
          return { module_id: moduleId, ok: true };
        }
        const jobId = items[0]!.job_id;
        const fb = await ctx.fetchApi("/api/v1/candidates/me/match-feedback", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({ job_id: jobId, feedback_value: "not_now" }),
        });
        if (fb.status !== 201 && fb.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `feedback post ${fb.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "cand_match_explanation": {
        const matches = await ctx.fetchApi("/api/v1/candidates/me/matches?limit=5&min_score=0", {
          headers: ctx.headers,
        });
        if (matches.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `matches ${matches.status}` };
        }
        const body = JSON.parse(matches.body) as {
          items?: Array<{ job_id: number; match_reason?: string | null; score?: number }>;
        };
        if (!Array.isArray(body.items)) {
          return { module_id: moduleId, ok: false, reason: "matches.items missing" };
        }
        // match_reason may be null — schema presence is the Hard LIVE bar for this module.
        for (const row of body.items) {
          if (!("match_reason" in row) && !("score" in row)) {
            return { module_id: moduleId, ok: false, reason: "match row missing score/reason fields" };
          }
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
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export function parseModuleSelection(raw: string | undefined): string[] {
  const value = (raw ?? "").trim();
  if (!value || value === "all" || value === "pending") {
    return [...WAVE1_SMOKEABLE_MODULES];
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
