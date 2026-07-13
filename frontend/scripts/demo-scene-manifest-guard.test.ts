/**
 * Interactive demo scene manifest — validation guard.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";
import {
  DEMO_SCENES,
  DEMO_SEQUENCES,
  scenesForRole,
  sequenceDurationMs,
  totalDurationMs,
  validateDemoSceneManifest,
} from "../src/lib/demo/demo-scene-manifest";

function resolveI18nKey(key: string): string | undefined {
  const [ns, ...rest] = key.split(".");
  const field = rest.join(".");
  const table = (en as Record<string, Record<string, string>>)[ns ?? ""];
  return table?.[field];
}

test("1 manifest validates with zero issues", () => {
  const issues = validateDemoSceneManifest();
  assert.deepEqual(issues, []);
});

test("2 every scene titleKey resolves in EN and PL", () => {
  for (const scene of DEMO_SCENES) {
    assert.ok(resolveI18nKey(scene.titleKey), `missing EN ${scene.titleKey}`);
    const plNs = scene.titleKey.split(".")[0] ?? "";
    const plField = scene.titleKey.split(".").slice(1).join(".");
    const plTable = (dictionaries.pl as Record<string, Record<string, string>>)[plNs];
    assert.ok(plTable?.[plField], `missing PL ${scene.titleKey}`);
  }
});

test("3 role filters return non-empty scene lists", () => {
  for (const role of ["overview", "candidate", "recruiter", "company"] as const) {
    assert.ok(scenesForRole(role).length > 0, role);
  }
});

test("4 sequences within target duration bands", () => {
  for (const seq of Object.values(DEMO_SEQUENCES)) {
    const sec = sequenceDurationMs(seq.id) / 1000;
    assert.ok(sec >= seq.targetDurationSec.min && sec <= seq.targetDurationSec.max, seq.id);
  }
});

test("5 full-demo analytics events use demo_ prefix", () => {
  for (const scene of DEMO_SCENES.filter((s) => s.surfaces.includes("full-demo"))) {
    assert.match(scene.analyticsEvent, /^demo_/);
    assert.doesNotMatch(scene.analyticsEvent, /@/);
  }
});

test("6 homepage analytics events use homepage_ prefix", () => {
  for (const scene of DEMO_SCENES.filter((s) => s.surfaces.includes("homepage-candidate"))) {
    assert.match(scene.analyticsEvent, /^homepage_/);
  }
});
