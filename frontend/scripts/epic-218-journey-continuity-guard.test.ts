/**
 * Epic 2.18 — Journey Continuity FE guard (Home Continue; no 8th primary nav).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA } from "../src/lib/candidate-ia.ts";
import {
  JOURNEY_CONTINUITY_MESSAGES_EN,
  JOURNEY_CONTINUITY_MESSAGES_PL,
} from "../src/lib/journey-continuity-messages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const panel = readFileSync(
  join(root, "src/components/dashboard/journey-continuity-panel.tsx"),
  "utf8",
);
const dash = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
const ia = readFileSync(join(root, "src/lib/candidate-ia.ts"), "utf8");
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(!ia.split("CANDIDATE_SECONDARY_IA")[0].includes("journey-continuity"));
assert.match(dash, /JourneyContinuityPanel/);
assert.match(panel, /journey-continuity\/continue/);
assert.match(panel, /data-journey-continuity-panel/);
assert.doesNotMatch(panel, /localStorage/);
assert.match(panel, /sessionStorage/); // revision hint only — server authoritative
assert.ok(!preview.includes("JourneyContinuityPanel"));
assert.ok(JOURNEY_CONTINUITY_MESSAGES_EN.notFirstValue);
assert.equal(
  Object.keys(JOURNEY_CONTINUITY_MESSAGES_EN).length,
  Object.keys(JOURNEY_CONTINUITY_MESSAGES_PL).length,
);

console.log("epic-218-journey-continuity-guard: ok");
