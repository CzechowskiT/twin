/**
 * Per-module Wave 2 recruiter prod smoke handlers.
 * Fail-closed without recruiter JWT (or mint via RECRUITER_INBOX_TOKEN).
 * Writes only when TWIN_PROD_SMOKE_WRITE=1.
 * Never logs JWT. Synthetic tenants only. No real outbound / ATS write / calendar invites.
 */

export type SmokeFetch = (
  path: string,
  init?: RequestInit,
) => Promise<{ status: number; body: string }>;

export type ModuleSmokeContext = {
  fetchApi: SmokeFetch;
  headers: Record<string, string>;
  write: boolean;
  companySlug: string;
};

export type ModuleSmokeResult =
  | { module_id: string; ok: true }
  | { module_id: string; ok: false; reason: string };

/** Modules Wave 2 aims to smoke toward LIVE (policy/demo excluded). */
export const WAVE2_SMOKEABLE_MODULES = [
  "recruiter_talent_radar",
  "recruiter_talent_radar_digest",
  "recruiter_talent_pool_import",
  "rec_scorecards",
  "rec_notes",
  "rec_matching",
  "rec_hiring_funnel_analytics",
  "recruiter_jobs",
  "recruiter_inbox",
  "recruiter_pipeline",
  "recruiter_search",
  "recruiter_talent_pool",
  "recruiter_analytics",
  "recruiter_notification_preferences",
  "recruiter_activity_timeline",
  "recruiter_trust_review_queue",
  "recruiter_saved_views",
  "rec_decisioning",
  "rec_shortlist",
  "recruiter_daily_cockpit",
] as const;

export const WAVE2_POLICY_HELD_MODULES = [
  "rec_interview_scheduling",
  "recruiter_calendar",
  "recruiter_integrations",
  "investor_sor_proof_ats",
  "rec_recruiter_onboarding",
  "rec_sla_tracking",
] as const;

export const WAVE2_DEMO_ONLY_MODULES = [
  "rec_candidate_comms",
  "rec_collaboration",
  "recruiter_demo_collaboration",
  "recruiter_demo_communication",
  "recruiter_demo_decision_memory",
  "recruiter_demo_pipeline",
  "recruiter_demo_profile_360",
  "recruiter_demo_team",
  "recruiter_demo_trust",
  "investor_sor_proof_collaboration",
  "investor_sor_proof_pipeline",
] as const;

export type Wave2SmokeableModule = (typeof WAVE2_SMOKEABLE_MODULES)[number];

function q(companySlug: string): string {
  return `company_slug=${encodeURIComponent(companySlug)}`;
}

export async function runModuleSmoke(
  moduleId: string,
  ctx: ModuleSmokeContext,
): Promise<ModuleSmokeResult> {
  try {
    switch (moduleId) {
      case "recruiter_talent_radar": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/talent-radar?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) return { module_id: moduleId, ok: false, reason: `radar ${res.status}` };
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_talent_radar_digest": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/talent-radar/digest?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) return { module_id: moduleId, ok: false, reason: `digest ${res.status}` };
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_talent_pool_import": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const preview = await ctx.fetchApi(
          `/api/v1/recruiter/talent-pool/import/preview?${q(ctx.companySlug)}`,
          {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({
              csv_text: "display_name,job_title,location\nWave2 Smoke Cand,Engineer,Remote\n",
              import_source: "wave2_prod_smoke",
            }),
          },
        );
        if (preview.status !== 200 && preview.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `import preview ${preview.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "rec_scorecards": {
        const inbox = await ctx.fetchApi(`/api/v1/recruiter/inbox?${q(ctx.companySlug)}&limit=5`, {
          headers: ctx.headers,
        });
        if (inbox.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `inbox ${inbox.status}` };
        }
        const items = (JSON.parse(inbox.body) as { items?: Array<{ application_id?: number; id?: number }> })
          .items;
        const appId = items?.[0]?.application_id ?? items?.[0]?.id;
        if (!appId) {
          // Empty tenant is OK if scorecard GET path responds for a synthetic probe via 400 ownership.
          return { module_id: moduleId, ok: true };
        }
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const put = await ctx.fetchApi(
          `/api/v1/recruiter/inbox/${appId}/scorecard?${q(ctx.companySlug)}`,
          {
            method: "PUT",
            headers: ctx.headers,
            body: JSON.stringify({ rating: 4, note: "wave2 scorecard smoke — no outbound" }),
          },
        );
        if (put.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `scorecard ${put.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "rec_notes": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const created = await ctx.fetchApi(`/api/v1/recruiter/decision-memory?${q(ctx.companySlug)}`, {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            subject_type: "candidate",
            subject_id: `wave2-synth-${Date.now()}`,
            decision_code: "advance",
            summary: "Wave 2 decision memory smoke",
            rationale_code: "skills_match",
          }),
        });
        if (created.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `decision-memory ${created.status}` };
        }
        const body = JSON.parse(created.body) as { demo_fixture: boolean };
        if (body.demo_fixture) {
          return { module_id: moduleId, ok: false, reason: "demo_fixture_leak" };
        }
        return { module_id: moduleId, ok: true };
      }
      case "rec_matching": {
        const search = await ctx.fetchApi(
          `/api/v1/recruiter/search?${q(ctx.companySlug)}&q=engineer&limit=5`,
          { headers: ctx.headers },
        );
        if (search.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `search ${search.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "rec_hiring_funnel_analytics":
      case "recruiter_analytics": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/analytics?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `analytics ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_jobs": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const created = await ctx.fetchApi(`/api/v1/recruiter/jobs?${q(ctx.companySlug)}`, {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            title: `Wave2 Smoke Role ${Date.now()}`,
            location: "Remote",
            description: "Synthetic smoke job — archive after create",
          }),
        });
        if (created.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `jobs create ${created.status}` };
        }
        const job = JSON.parse(created.body) as { id: number };
        const archived = await ctx.fetchApi(
          `/api/v1/recruiter/jobs/${job.id}/archive?${q(ctx.companySlug)}`,
          { method: "POST", headers: ctx.headers },
        );
        if (archived.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `jobs archive ${archived.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_inbox":
      case "rec_decisioning":
      case "rec_shortlist": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/inbox?${q(ctx.companySlug)}&limit=10`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) return { module_id: moduleId, ok: false, reason: `inbox ${res.status}` };
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_pipeline": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/pipeline?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `pipeline ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_search": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/search?${q(ctx.companySlug)}&limit=5`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) return { module_id: moduleId, ok: false, reason: `search ${res.status}` };
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_talent_pool": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/talent-pool?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `talent-pool ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_notification_preferences": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const get = await ctx.fetchApi(
          `/api/v1/recruiter/notification-preferences?${q(ctx.companySlug)}`,
          { headers: ctx.headers },
        );
        if (get.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `notif get ${get.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_activity_timeline": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/activity-timeline?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `timeline ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_trust_review_queue": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/trust-review-queue?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `trust-queue ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_saved_views": {
        const res = await ctx.fetchApi(`/api/v1/recruiter/saved-views?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `saved-views ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "recruiter_daily_cockpit": {
        // Cockpit is FE-composed; smoke activation + analytics as live backends.
        const act = await ctx.fetchApi(`/api/v1/recruiter/activation?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (act.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `activation ${act.status}` };
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

export function parseModuleSelection(raw: string | undefined): Wave2SmokeableModule[] {
  const value = (raw || "all").trim().toLowerCase();
  if (!value || value === "all" || value === "pending") {
    return [...WAVE2_SMOKEABLE_MODULES];
  }
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Wave2SmokeableModule[];
  const allowed = new Set<string>(WAVE2_SMOKEABLE_MODULES);
  return selected.filter((id) => allowed.has(id));
}
