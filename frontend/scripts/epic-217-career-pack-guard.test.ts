/**
 * Epic 2.17 — Career Pack FE guard (no 8th primary nav; secondary only).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA, CANDIDATE_SECONDARY_IA } from "../src/lib/candidate-ia.ts";
import {
  CAREER_PACK_MESSAGES_EN,
  CAREER_PACK_MESSAGES_PL,
} from "../src/lib/career-pack-messages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "src/app/dashboard/career-pack/page.tsx"), "utf8");
const ws = readFileSync(
  join(root, "src/components/candidate/career-pack-workspace.tsx"),
  "utf8",
);
const privacy = readFileSync(join(root, "src/app/dashboard/privacy-center/page.tsx"), "utf8");
const studio = readFileSync(
  join(root, "src/app/dashboard/application-studio/page.tsx"),
  "utf8",
);
const portfolio = readFileSync(join(root, "src/app/dashboard/portfolio/page.tsx"), "utf8");
const pathPanel = readFileSync(
  join(root, "src/components/dashboard/path-readiness-panel.tsx"),
  "utf8",
);
const ia = readFileSync(join(root, "src/lib/candidate-ia.ts"), "utf8");

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(CANDIDATE_SECONDARY_IA.some((x) => x.href === "/dashboard/career-pack"));
assert.ok(!CANDIDATE_PRIMARY_IA.some((x) => x.href === "/dashboard/career-pack"));
assert.ok(!ia.split("CANDIDATE_SECONDARY_IA")[0].includes("/dashboard/career-pack"));

assert.match(page, /CareerPackWorkspace/);
assert.match(ws, /career-packs\/catalog/);
assert.match(ws, /career-packs\/.*\/download/);
assert.doesNotMatch(ws, /\/send|\/share|\/publish/);
assert.match(privacy, /career-pack/);
assert.match(studio, /career-pack/);
assert.match(portfolio, /career-pack/);
assert.match(pathPanel, /career-pack/);

assert.ok(CAREER_PACK_MESSAGES_EN.markerNoSend);
assert.ok(CAREER_PACK_MESSAGES_PL.markerNoSend);
assert.equal(
  Object.keys(CAREER_PACK_MESSAGES_EN).length,
  Object.keys(CAREER_PACK_MESSAGES_PL).length,
);

console.log("epic-217-career-pack-guard: ok");
