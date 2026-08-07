/** Epic 2.12 — Import Center IA / no 8th nav / PP1 intact. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CANDIDATE_PRIMARY_IA, CANDIDATE_SECONDARY_IA } from "../src/lib/candidate-ia.ts";
import { isPublicPreviewEnabled } from "../src/lib/public-preview-gate.ts";

assert.equal(CANDIDATE_PRIMARY_IA.length, 7);
assert.ok(CANDIDATE_SECONDARY_IA.some((x) => x.href === "/dashboard/import"));
assert.equal(
  CANDIDATE_PRIMARY_IA.some((x) => x.href === "/dashboard/import"),
  false,
);

const root = join(import.meta.dirname, "..");
const page = readFileSync(join(root, "src/app/dashboard/import/page.tsx"), "utf8");
assert.ok(page.includes("ImportCenterWorkspace"));
const preview = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");
assert.ok(!preview.includes("ImportCenter"));

// PP1 must remain independently gated (this process may or may not enable it)
assert.equal(typeof isPublicPreviewEnabled(), "boolean");

console.log("epic-212-import-center-guard: ok");
