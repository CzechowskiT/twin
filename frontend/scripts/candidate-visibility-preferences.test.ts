import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_VISIBILITY_PREFERENCES_API_PATH,
  CANDIDATE_VISIBILITY_PREFERENCES_FORBIDDEN_PATTERNS,
  CANDIDATE_VISIBILITY_PREFERENCES_ROUTE,
} from "../src/lib/candidate-visibility-preferences";
import { en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 backend router registers API", () => {
  assert.match(readFileSync(join(repo, "backend/app/api/router.py"), "utf8"), /candidate_visibility_preferences/);
  assert.equal(CANDIDATE_VISIBILITY_PREFERENCES_API_PATH, "/api/v1/candidate-visibility-preferences");
});

test("2 UI routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/visibility-preferences/page.tsx")));
  assert.equal(CANDIDATE_VISIBILITY_PREFERENCES_ROUTE, "/dashboard/trust/visibility-preferences");
});

test("3 no DELETE in API", () => {
  assert.doesNotMatch(readFileSync(join(repo, "backend/app/api/candidate_visibility_preferences.py"), "utf8"), /@router\.delete/);
});

test("4 audit on writes", () => {
  assert.match(readFileSync(join(repo, "backend/app/services/candidate_visibility_preferences.py"), "utf8"), /create_audit_event/);
});

test("5 control center link", () => {
  assert.match(read("src/components/candidate/candidate-control-center-workspace.tsx"), /candidate-control-center-visibility-preferences-link/);
});

test("6 forbidden copy guard", () => {
  const ws = read("src/components/candidate/candidate-visibility-preferences-workspace.tsx");
  for (const pat of CANDIDATE_VISIBILITY_PREFERENCES_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(ws, pat);
  }
});

test("7 i18n keys present", () => {
  assert.ok(en.candidateVisibilityPreferences.pageTitle);
});

test("8 docs", () => assert.ok(existsSync(join(repo, "docs/CANDIDATE_VISIBILITY_PREFERENCES_2026-06-19.md"))));

test("9 package script", () => assert.match(readFileSync(join(root, "package.json"), "utf8"), /test:candidate-visibility-preferences/));
