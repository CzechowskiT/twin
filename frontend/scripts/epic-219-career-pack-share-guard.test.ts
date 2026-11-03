/**
 * Epic 2.19 — Career Pack share FE guard.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA } from "../src/lib/candidate-ia.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ws = readFileSync(
  join(root, "src/components/candidate/career-pack-workspace.tsx"),
  "utf8",
);
const recipient = readFileSync(
  join(root, "src/app/share/career-pack/[publicId]/page.tsx"),
  "utf8",
);
const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
const ia = readFileSync(join(root, "src/lib/candidate-ia.ts"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(!ia.split("CANDIDATE_SECONDARY_IA")[0].includes("share/career-pack"));
assert.match(ws, /data-career-pack-share/);
assert.match(ws, /career-packs\/.*\/shares/);
assert.doesNotMatch(ws, /\/send|mailto:/);
assert.match(recipient, /key=/);
assert.match(recipient, /history\.replaceState/);
assert.match(recipient, /X-Twin-Share-Session/);
assert.doesNotMatch(recipient, /\/register|signup/);
assert.match(middleware, /share\/career-pack/);
assert.match(middleware, /noindex/);
assert.match(robots, /\/share\//);

console.log("epic-219-career-pack-share-guard: ok");
