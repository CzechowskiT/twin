/** Wave B/C critical modules — i18n keys and a11y markers guard. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const RECRUITER_I18N_KEYS = [
  "recruiterActivation.title",
  "recruiterActivation.stepConnectWorkspace",
  "recruiterTalentPool.title",
  "recruiterTrustReviewQueue.pageTitle",
] as const;

function hasNestedKey(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur != null && String(cur).length > 0;
}

test("1 recruiter activation i18n keys in en", () => {
  for (const key of RECRUITER_I18N_KEYS) {
    assert.ok(hasNestedKey(en as Record<string, unknown>, key), `missing ${key}`);
  }
});

test("2 activation panel has aria/data marker", () => {
  const panel = readFileSync(join(root, "src/components/recruiter/recruiter-activation-panel.tsx"), "utf8");
  assert.match(panel, /data-recruiter-activation-panel/);
});

test("3 talent pool client uses t() not raw English title", () => {
  const client = readFileSync(join(root, "src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx"), "utf8");
  assert.match(client, /t\(/);
  assert.doesNotMatch(client, /Talent Pool Persistence Demo/);
});

test("4 trust review queue workspace uses t()", () => {
  const ws = readFileSync(
    join(root, "src/components/recruiter/recruiter-trust-review-queue-workspace.tsx"),
    "utf8",
  );
  assert.match(ws, /t\(/);
});

test("5 career compass page uses t()", () => {
  const page = readFileSync(join(root, "src/app/dashboard/career/page.tsx"), "utf8");
  assert.match(page, /t\(/);
});

test("6 wave C3-C5 documented in decision doc", () => {
  const doc = readFileSync(join(root, "..", "docs/AUTONOMOUS_BATCH_DECISION_WAVE_C3_C5_2026-07-13.md"), "utf8");
  assert.match(doc, /C3|notification/i);
  assert.match(doc, /C4|saved views/i);
});

test("7 activation panel has role or aria label", () => {
  const panel = readFileSync(join(root, "src/components/recruiter/recruiter-activation-panel.tsx"), "utf8");
  assert.match(panel, /aria-|role=/);
});
