/**
 * Smoke evidence validator — rejects fake PASS and placeholder fields.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  docContainsFakePass,
  parseSmokeEvidenceFrontmatter,
  validateSmokeEvidence,
  type SmokeEvidenceRecord,
} from "./lib/smoke-evidence-validator";

const VALID_FRONTMATTER = `---
tester: Tomasz Czechowski
date: 2026-07-13
environment: preview-449
deploy_sha: 905a660c7d627b389dedc6a41a6346997b0398b3
slices:
  - id: C1_activation
    result: PASS
founder_smoke_pass: false
---
`;

function validRecord(overrides?: Partial<SmokeEvidenceRecord>): SmokeEvidenceRecord {
  return {
    schemaVersion: "1",
    tester: "Tomasz Czechowski",
    date: "2026-07-13",
    environment: "preview-449",
    deploySha: "905a660c7d627b389dedc6a41a6346997b0398b3",
    slices: [{ id: "C1_activation", result: "PASS" }],
    founderSmokePass: false,
    ...overrides,
  };
}

test("1 parses frontmatter", () => {
  const r = parseSmokeEvidenceFrontmatter(VALID_FRONTMATTER);
  assert.ok(r);
  assert.equal(r!.tester, "Tomasz Czechowski");
});

test("2 valid record passes", () => {
  assert.equal(validateSmokeEvidence(validRecord()).length, 0);
});

test("3 rejects placeholder tester", () => {
  const issues = validateSmokeEvidence(validRecord({ tester: "agent" }));
  assert.ok(issues.some((i) => i.path === "tester"));
});

test("4 rejects placeholder date", () => {
  const issues = validateSmokeEvidence(validRecord({ date: "YYYY-MM-DD" }));
  assert.ok(issues.some((i) => i.path === "date"));
});

test("5 rejects short deploy sha", () => {
  const issues = validateSmokeEvidence(validRecord({ deploySha: "abc" }));
  assert.ok(issues.some((i) => i.path === "deploySha"));
});

test("6 rejects PASS claim with FAIL slice", () => {
  const issues = validateSmokeEvidence(
    validRecord({
      founderSmokePass: true,
      slices: [
        { id: "C1", result: "PASS" },
        { id: "C2", result: "FAIL" },
      ],
    }),
  );
  assert.ok(issues.some((i) => i.path === "founderSmokePass"));
});

test("7 rejects PASS claim with PENDING slice", () => {
  const issues = validateSmokeEvidence(
    validRecord({
      founderSmokePass: true,
      slices: [{ id: "C1", result: "PENDING" }],
    }),
  );
  assert.ok(issues.some((i) => i.path === "founderSmokePass"));
});

test("8 docContainsFakePass detects invalid PASS line", () => {
  const doc = `FOUNDER_SMOKE: PASS\ntester: agent\ndate: tbd`;
  assert.equal(docContainsFakePass(doc), true);
});

test("9 empty slices rejected", () => {
  assert.ok(validateSmokeEvidence(validRecord({ slices: [] })).some((i) => i.path === "slices"));
});

test("10 invalid slice result rejected", () => {
  const issues = validateSmokeEvidence(
    validRecord({ slices: [{ id: "x", result: "MAYBE" as "PASS" }] }),
  );
  assert.ok(issues.some((i) => i.path === "slices.x"));
});

test("11 schema doc exists", async () => {
  const { readFileSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const doc = readFileSync(join(repo, "docs/schemas/FOUNDER_SMOKE_EVIDENCE_SCHEMA.md"), "utf8");
  assert.match(doc, /schema_version: 1/);
  assert.match(doc, /No fake PASS/);
});
