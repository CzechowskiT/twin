import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANDIDATE_PRIMARY_IA, CANDIDATE_SECONDARY_IA } from "../src/lib/candidate-ia.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const layout = readFileSync(join(root, "src/app/dashboard/layout.tsx"), "utf8");
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");
const palette = readFileSync(
  join(root, "src/components/candidate/workspace-search-palette.tsx"),
  "utf8"
);

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(CANDIDATE_SECONDARY_IA.some((x) => x.href === "/dashboard/workspace-search"));
assert.ok(!CANDIDATE_PRIMARY_IA.some((x) => x.href === "/dashboard/workspace-search"));
assert.match(layout, /WorkspaceSearchPalette/);
assert.doesNotMatch(preview, /WorkspaceSearchPalette/);
assert.match(palette, /Meta\+K|Ctrl\+K|metaKey/);
assert.match(palette, /no-store|workspace-search/);
console.log("epic-213-workspace-search-guard: ok");
