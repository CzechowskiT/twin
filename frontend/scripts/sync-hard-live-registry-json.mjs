/**
 * Sync docs/HARD_LIVE_EVIDENCE_REGISTRY.json from TS registry exports.
 * Run: npx tsx scripts/sync-hard-live-registry-json.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const {
  HARD_LIVE_EVIDENCE_REGISTRY,
  HARD_LIVE_REGISTRY_META,
} = await import("../src/lib/hard-live-evidence-registry.ts");

const doc = {
  definition: HARD_LIVE_REGISTRY_META.definition,
  wave: HARD_LIVE_REGISTRY_META.wave,
  updated: new Date().toISOString().slice(0, 10),
  stance: {
    pilot: HARD_LIVE_REGISTRY_META.stance.pilot,
    gate_f: HARD_LIVE_REGISTRY_META.stance.gate_f,
    launch: HARD_LIVE_REGISTRY_META.stance.launch,
    pmf: HARD_LIVE_REGISTRY_META.stance.pmf,
    real_candidate_enrollment: "NOT_STARTED",
    real_recruiter_enrollment: "NOT_STARTED",
    real_company_enrollment: "NOT_STARTED",
    external_pilot_enrollment_enabled:
      HARD_LIVE_REGISTRY_META.stance.external_pilot_enrollment_enabled,
  },
  live_badge_rule: HARD_LIVE_REGISTRY_META.live_badge_rule,
  smoke_evidence: HARD_LIVE_REGISTRY_META.smoke_evidence,
  modules: HARD_LIVE_EVIDENCE_REGISTRY.map((m) => ({
    module_id: m.module_id,
    persona: m.persona,
    wave: m.wave,
    status: m.status,
    route: m.route,
    blocker: m.blocker,
    owner: m.owner,
    ...(m.smoke_sha ? { smoke_sha: m.smoke_sha } : {}),
    ...(m.smoke_at ? { smoke_at: m.smoke_at } : {}),
  })),
  wave4_note: HARD_LIVE_REGISTRY_META.wave4_note,
};

writeFileSync(
  join(root, "docs/HARD_LIVE_EVIDENCE_REGISTRY.json"),
  `${JSON.stringify(doc, null, 2)}\n`,
  "utf8",
);
console.log(`Wrote ${doc.modules.length} modules`);
