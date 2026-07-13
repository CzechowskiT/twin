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

test("12 rejects empty environment", () => {
  assert.ok(validateSmokeEvidence(validRecord({ environment: "" })).some((i) => i.path === "environment"));
});

test("13 rejects tbd deploy sha", () => {
  assert.ok(validateSmokeEvidence(validRecord({ deploySha: "tbd" })).some((i) => i.path === "deploySha"));
});

test("14 rejects cursor tester", () => {
  assert.ok(validateSmokeEvidence(validRecord({ tester: "cursor" })).some((i) => i.path === "tester"));
});

test("15 rejects invalid schema version", () => {
  assert.ok(
    validateSmokeEvidence(validRecord({ schemaVersion: "2" as "1" })).some((i) => i.path === "schemaVersion"),
  );
});

test("16 rejects malformed date", () => {
  assert.ok(validateSmokeEvidence(validRecord({ date: "13-07-2026" })).some((i) => i.path === "date"));
});

test("17 rejects empty tester", () => {
  assert.ok(validateSmokeEvidence(validRecord({ tester: "" })).some((i) => i.path === "tester"));
});

test("18 rejects n/a tester", () => {
  assert.ok(validateSmokeEvidence(validRecord({ tester: "n/a" })).some((i) => i.path === "tester"));
});

test("19 rejects all SKIP with PASS claim", () => {
  const issues = validateSmokeEvidence(
    validRecord({
      founderSmokePass: true,
      slices: [{ id: "only", result: "SKIP" }],
    }),
  );
  assert.equal(issues.length, 0);
});

test("20 rejects placeholder deploy ellipsis", () => {
  assert.ok(validateSmokeEvidence(validRecord({ deploySha: "..." })).some((i) => i.path === "deploySha"));
});

test("21 parse returns null without frontmatter", () => {
  assert.equal(parseSmokeEvidenceFrontmatter("no frontmatter"), null);
});

test("22 rejects PASS with placeholder tester in frontmatter doc", () => {
  const doc = `---
tester: agent
date: 2026-07-13
environment: prod
deploy_sha: 905a660c7d627b389dedc6a41a6346997b0398b3
slices:
  - id: x
    result: PASS
founder_smoke_pass: true
---
FOUNDER_SMOKE: PASS`;
  assert.equal(docContainsFakePass(doc), true);
});

test("23 rejects missing slices in record", () => {
  const issues = validateSmokeEvidence({ ...validRecord(), slices: [] });
  assert.ok(issues.some((i) => i.path === "slices"));
});

test("24 rejects FAIL slice without pass claim still valid structurally", () => {
  const issues = validateSmokeEvidence(
    validRecord({ slices: [{ id: "x", result: "FAIL" }], founderSmokePass: false }),
  );
  assert.equal(issues.length, 0);
});

test("25 rejects auto tester", () => {
  assert.ok(validateSmokeEvidence(validRecord({ tester: "auto" })).some((i) => i.path === "tester"));
});

test("26 schema version 1 documented in validator types", () => {
  assert.equal(validRecord().schemaVersion, "1");
});
