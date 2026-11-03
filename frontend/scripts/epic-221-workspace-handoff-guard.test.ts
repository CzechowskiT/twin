/**
 * Epic 2.21 — FE guard: handoff banner, IA=7, Continuity sole Continue.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ia = read("src/lib/candidate-ia.ts");
const primary = ia.split("CANDIDATE_SECONDARY_IA")[0];
assert.equal((primary.match(/href:/g) || []).length, 7, "primary IA must stay 7");

const banner = read("src/components/candidate/workspace-handoff-banner.tsx");
assert.match(banner, /data-workspace-handoff-banner/);
assert.match(banner, /history\.replaceState/);
assert.match(banner, /workspace-handoffs\/resolve/);
assert.doesNotMatch(banner, /next.?best|urgency|score/i);

const importWs = read("src/components/candidate/import-center-workspace.tsx");
assert.match(importWs, /import_to_data_trust/);

const dataTrust = read("src/components/candidate/data-trust-workspace.tsx");
assert.match(dataTrust, /data_trust_to_path_home/);

const pack = read("src/components/candidate/career-pack-workspace.tsx");
assert.match(pack, /career_pack_to_access_center/);

const studio = read("src/app/dashboard/application-studio/page.tsx");
assert.match(studio, /app_studio_to_career_pack/);
assert.match(studio, /WorkspaceHandoffBanner/);

const matches = read("src/components/candidate/candidate-matches-workspace.tsx");
assert.match(matches, /opportunity_to_app_studio/);

const access = read("src/components/candidate/access-control-center-workspace.tsx");
assert.match(access, /expectedDestRouteKey=\"access_center\"/);

const dash = read("src/app/dashboard/page.tsx");
assert.match(dash, /JourneyContinuityPanel/);
assert.match(dash, /WorkspaceHandoffBanner/);
assert.match(dash, /path_home/);

const msgs = read("src/lib/handoff-messages.ts");
assert.match(msgs, /HANDOFF_MESSAGES_EN/);
assert.match(msgs, /HANDOFF_MESSAGES_PL/);

console.log("epic-221-workspace-handoff-guard: ok");
