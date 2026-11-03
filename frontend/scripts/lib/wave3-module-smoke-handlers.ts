/**
 * Per-module Wave 3 company prod smoke handlers.
 * Fail-closed without recruiter/company JWT (or mint via RECRUITER_INBOX_TOKEN).
 * Writes only when TWIN_PROD_SMOKE_WRITE=1.
 * Never logs JWT. Synthetic tenants only. No real outbound / ATS write / calendar invites / Stripe.
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

/** Modules Wave 3 aims to smoke toward LIVE (policy/demo excluded). */
export const WAVE3_SMOKEABLE_MODULES = [
  "company_dashboard",
  "company_pipeline",
  "company_roles",
  "rec_vacancy_creation",
  "company_hiring_cockpit",
  "company_hiring_command_center",
  "company_talent_pool",
  "company_team",
  "company_candidate_trust_summary",
  "company_org_settings",
  "company_permissions",
  "company_analytics",
  "company_audit_log",
  "company_scorecards",
  "company_notifications",
  "company_onboarding_synthetic",
] as const;

export const WAVE3_POLICY_HELD_MODULES = [
  "company_integrations",
  "rec_ats_sync",
  "rec_vacancy_import",
  "company_ats_import_readiness",
  "company_billing",
  "company_billing_public_claim",
  "rec_subscription",
  "company_ms_calendar_write",
  "company_invite_delivery",
  "rec_company_onboarding",
] as const;

export const WAVE3_DEMO_ONLY_MODULES = [
  "company_demo_collaboration",
  "company_demo_communication",
  "company_demo_decision_memory",
  "company_demo_pipeline",
  "company_demo_profile_360",
  "company_demo_team",
  "company_demo_trust",
] as const;

export type Wave3SmokeableModule = (typeof WAVE3_SMOKEABLE_MODULES)[number];

function q(companySlug: string): string {
  return `company_slug=${encodeURIComponent(companySlug)}`;
}

export async function runModuleSmoke(
  moduleId: string,
  ctx: ModuleSmokeContext,
): Promise<ModuleSmokeResult> {
  try {
    switch (moduleId) {
      case "company_dashboard":
      case "company_hiring_cockpit":
      case "company_hiring_command_center":
      case "company_analytics": {
        const res = await ctx.fetchApi(`/api/v1/company/hiring-dashboard?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `hiring-dashboard ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_pipeline": {
        const res = await ctx.fetchApi(`/api/v1/company/pipeline-quality?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `pipeline ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_roles": {
        const res = await ctx.fetchApi(`/api/v1/company/roles?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `roles ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "rec_vacancy_creation": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const created = await ctx.fetchApi(`/api/v1/company/roles?${q(ctx.companySlug)}`, {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            title: "Wave3 Smoke Role",
            status: "draft",
            location: "Remote",
            description: "Synthetic vacancy for Wave 3 smoke",
          }),
        });
        if (created.status !== 201 && created.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `role create ${created.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_talent_pool": {
        const res = await ctx.fetchApi(`/api/v1/company/talent-pool?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `talent-pool ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_team": {
        const res = await ctx.fetchApi(`/api/v1/company/team?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `team ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_candidate_trust_summary": {
        const demo = await ctx.fetchApi(
          `/api/v1/company/trust-summary?${q(ctx.companySlug)}&subject_id=demo-candidate-001`,
          { headers: ctx.headers },
        );
        if (demo.status !== 400) {
          return {
            module_id: moduleId,
            ok: false,
            reason: `demo trust expected 400 got ${demo.status}`,
          };
        }
        const ok = await ctx.fetchApi(
          `/api/v1/company/trust-summary?${q(ctx.companySlug)}&subject_id=cand-synth-wave3`,
          { headers: ctx.headers },
        );
        if (ok.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `trust-summary ${ok.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_org_settings": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const put = await ctx.fetchApi(`/api/v1/company/org-settings?${q(ctx.companySlug)}`, {
          method: "PUT",
          headers: ctx.headers,
          body: JSON.stringify({
            display_name: "Wave3 Smoke Org",
            timezone: "Europe/Warsaw",
            locale: "en",
            hiring_policy: { smoke: true },
            updated_by_role: "company_admin",
          }),
        });
        if (put.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `org-settings ${put.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_permissions": {
        const res = await ctx.fetchApi(`/api/v1/company/permissions?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `permissions ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_audit_log": {
        const res = await ctx.fetchApi(`/api/v1/company/audit-log?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `audit-log ${res.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_scorecards": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const demo = await ctx.fetchApi(`/api/v1/company/scorecards?${q(ctx.companySlug)}`, {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            subject_id: "demo-candidate-001",
            decision_code: "advance",
            summary: "must fail",
          }),
        });
        if (demo.status !== 400) {
          return {
            module_id: moduleId,
            ok: false,
            reason: `demo scorecard expected 400 got ${demo.status}`,
          };
        }
        const created = await ctx.fetchApi(`/api/v1/company/scorecards?${q(ctx.companySlug)}`, {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            subject_id: "cand-synth-wave3",
            decision_code: "advance",
            summary: "Wave3 smoke scorecard",
            rating: 4,
          }),
        });
        if (created.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `scorecard ${created.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_notifications": {
        if (!ctx.write) return { module_id: moduleId, ok: false, reason: "write_required" };
        const forbidden = await ctx.fetchApi(
          `/api/v1/company/notifications/draft?${q(ctx.companySlug)}`,
          {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({ body_preview: "must not send", send: true }),
          },
        );
        if (forbidden.status !== 400) {
          return {
            module_id: moduleId,
            ok: false,
            reason: `send forbidden expected 400 got ${forbidden.status}`,
          };
        }
        const draft = await ctx.fetchApi(
          `/api/v1/company/notifications/draft?${q(ctx.companySlug)}`,
          {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({ body_preview: "wave3 draft only", send: false }),
          },
        );
        if (draft.status !== 201) {
          return { module_id: moduleId, ok: false, reason: `notif draft ${draft.status}` };
        }
        return { module_id: moduleId, ok: true };
      }
      case "company_onboarding_synthetic": {
        const res = await ctx.fetchApi(`/api/v1/company/onboarding?${q(ctx.companySlug)}`, {
          headers: ctx.headers,
        });
        if (res.status !== 200) {
          return { module_id: moduleId, ok: false, reason: `onboarding ${res.status}` };
        }
        const body = JSON.parse(res.body) as { enrollment_enabled?: boolean };
        if (body.enrollment_enabled !== false) {
          return { module_id: moduleId, ok: false, reason: "enrollment_must_stay_off" };
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

export function parseModuleSelection(raw: string | undefined): Wave3SmokeableModule[] {
  const value = (raw || "all").trim().toLowerCase();
  if (!value || value === "all" || value === "pending") {
    return [...WAVE3_SMOKEABLE_MODULES];
  }
  const selected = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Wave3SmokeableModule[];
  const allowed = new Set<string>(WAVE3_SMOKEABLE_MODULES);
  return selected.filter((id) => allowed.has(id));
}
