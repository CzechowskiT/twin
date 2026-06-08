import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";

const pl = dictionaries.pl;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GUIDED_KEYS = [
  "guidedEmptyMatchesTitle",
  "guidedEmptyMatchesStep1",
  "guidedEmptyMatchesStep2",
  "guidedEmptyMatchesStep3",
  "guidedEmptyApplicationsTitle",
  "guidedEmptyApplicationsStep1",
  "guidedEmptyInboxStep1",
  "guidedEmptyCalendarStep1",
  "guidedEmptyRecruiterJobsTitle",
] as const;

test("guided empty state component caps steps at three", () => {
  const src = readFileSync(join(root, "src/components/ux/guided-empty-state.tsx"), "utf8");
  assert.match(src, /\.slice\(0, 3\)/);
});

test("PL and EN include guided empty state keys", () => {
  for (const key of GUIDED_KEYS) {
    assert.ok(en.ux[key], `missing EN ux.${key}`);
    assert.ok(pl.ux[key], `missing PL ux.${key}`);
  }
});
