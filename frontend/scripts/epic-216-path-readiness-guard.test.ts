import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA } from "../src/lib/candidate-ia.ts";
import {
  PATH_READINESS_MESSAGES_EN,
  PATH_READINESS_MESSAGES_PL,
} from "../src/lib/path-readiness-messages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i18n = readFileSync(join(root, "src/lib/i18n.ts"), "utf8");
const panel = readFileSync(
  join(root, "src/components/dashboard/path-readiness-panel.tsx"),
  "utf8"
);
const dash = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(!CANDIDATE_PRIMARY_IA.some((x) => String(x.href).includes("path-readiness")));
assert.match(i18n, /pathReadiness/);
assert.match(i18n, /PATH_READINESS_MESSAGES_EN/);

const values = [
  ...Object.values(PATH_READINESS_MESSAGES_EN),
  ...Object.values(PATH_READINESS_MESSAGES_PL),
].join("\n");
assert.doesNotMatch(values, /ready to apply/i);
assert.doesNotMatch(values, /ready to interview/i);
assert.doesNotMatch(values, /career-ready/i);
assert.match(PATH_READINESS_MESSAGES_EN.markerNoBest, /No recommended or best path/);
assert.match(panel, /path-readiness\/options/);
assert.match(panel, /data-path-readiness-panel/);
assert.match(dash, /PathReadinessPanel/);
assert.doesNotMatch(preview, /PathReadinessPanel/);
console.log("epic-216-path-readiness-guard: ok");
