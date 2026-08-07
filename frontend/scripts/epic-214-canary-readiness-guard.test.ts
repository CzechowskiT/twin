import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA, CANDIDATE_SECONDARY_IA } from "../src/lib/candidate-ia.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dash = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
const i18n = readFileSync(join(root, "src/lib/i18n.ts"), "utf8");
const panel = readFileSync(
  join(root, "src/components/dashboard/canary-first-value-panel.tsx"),
  "utf8"
);
const admin = readFileSync(join(root, "src/app/admin/canary/page.tsx"), "utf8");
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");
const msgs = readFileSync(join(root, "src/lib/canary-journey-messages.ts"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(CANDIDATE_SECONDARY_IA.some((x) => x.href === "/dashboard/workspace-search"));
assert.ok(!CANDIDATE_PRIMARY_IA.some((x) => x.href === "/dashboard/workspace-search"));
assert.match(dash, /CanaryFirstValuePanel/);
assert.match(i18n, /canaryJourney/);
assert.match(i18n, /CANARY_JOURNEY_MESSAGES_EN/);
assert.match(panel, /first-value-ladder/);
assert.match(panel, /SYNTHETIC/);
assert.match(admin, /CanaryControlPanel/);
assert.doesNotMatch(preview, /CanaryFirstValuePanel/);
assert.match(msgs, /adminNeverAuto/);
console.log("epic-214-canary-readiness-guard: ok");
