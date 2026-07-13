/** Observability redaction guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOC = join(repoRoot, "docs/OBSERVABILITY_STRUCTURED_LOGGING_2026-07-13.md");

test("1 observability doc exists", () => {
  assert.match(readFileSync(DOC, "utf8"), /Structured logging/);
});

test("2 never log secrets listed", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /Never log/i);
  assert.match(doc, /DEMO_USER_PASSWORD/);
  assert.match(doc, /JWT/);
});

test("3 wave metrics documented", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /career_compass_save_total/);
  assert.match(doc, /trust_review_decision_total/);
});

test("4 backend main does not print recruiter token", () => {
  const main = readFileSync(join(repoRoot, "backend/app/main.py"), "utf8");
  assert.doesNotMatch(main, /print\(.*recruiter.*token/i);
});

test("5 observability events catalog documented", () => {
  const doc = readFileSync(DOC, "utf8");
  assert.match(doc, /career_compass_save_total/);
  assert.match(doc, /trust_review_decision_total/);
});
