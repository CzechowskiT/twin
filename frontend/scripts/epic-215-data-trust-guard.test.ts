import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA, CANDIDATE_SECONDARY_IA } from "../src/lib/candidate-ia.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i18n = readFileSync(join(root, "src/lib/i18n.ts"), "utf8");
const msgs = readFileSync(join(root, "src/lib/data-trust-messages.ts"), "utf8");
const page = readFileSync(join(root, "src/app/dashboard/data-trust/page.tsx"), "utf8");
const ws = readFileSync(
  join(root, "src/components/candidate/data-trust-workspace.tsx"),
  "utf8"
);
const privacy = readFileSync(join(root, "src/app/dashboard/privacy-center/page.tsx"), "utf8");
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(CANDIDATE_SECONDARY_IA.some((x) => x.href === "/dashboard/data-trust"));
assert.ok(!CANDIDATE_PRIMARY_IA.some((x) => x.href === "/dashboard/data-trust"));
assert.match(i18n, /dataTrust/);
assert.match(i18n, /DATA_TRUST_MESSAGES_EN/);
assert.match(msgs, /notFirstValue/);
assert.match(msgs, /markerNoAuto/);
assert.match(page, /DataTrustWorkspace/);
assert.match(ws, /data-trust\/reviews/);
assert.match(ws, /impact-preview/);
assert.match(privacy, /data-trust/);
assert.doesNotMatch(preview, /DataTrustWorkspace/);
console.log("epic-215-data-trust-guard: ok");
