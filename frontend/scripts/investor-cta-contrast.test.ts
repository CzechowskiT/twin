import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { INVESTOR_WORKSPACE_MODULES } from "../src/lib/investor-workspace-modules";
import { dictionaries, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const INVESTOR_CTA_KEYS = [
  "investorMetricsCta",
  "investorRoadmapCta",
  "investorDataRoomCta",
  "investorCalculatorCta",
  "investorPlacementCta",
  "investorContactCta",
] as const;

const PL_LABELS = [
  "Zobacz metryki",
  "Otwórz roadmapę",
  "Poproś o dostęp",
  "Otwórz kalkulator",
  "Demo placementu",
  "Napisz do zespołu",
] as const;

test("twin-btn-primary uses on-cta token not hardcoded white", () => {
  const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
  const start = css.indexOf(".twin-btn-primary {");
  assert.ok(start >= 0);
  const end = css.indexOf("}", start);
  const block = css.slice(start, end + 1);
  assert.match(block, /color:\s*var\(--twin-on-cta\)/);
  assert.doesNotMatch(block, /color:\s*#ffffff/);
});

test("studio mode forces dark label on light CTA pills", () => {
  const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
  assert.match(css, /html\[data-marketing-surface="studio"\][\s\S]*\.twin-btn-primary[\s\S]*#0f172a\s*!important/);
});

test("workspace module card CTA declares on-cta text color", () => {
  const card = readFileSync(join(root, "src/components/workspace/workspace-module-card.tsx"), "utf8");
  assert.match(card, /twin-btn-primary/);
  assert.match(card, /text-\[var\(--twin-on-cta\)\]/);
  assert.doesNotMatch(card, /text-white/);
});

test("investor workspace modules wire all six mission CTA keys", () => {
  const keys = INVESTOR_WORKSPACE_MODULES.map((m) => m.ctaKey.split(".").pop());
  for (const key of INVESTOR_CTA_KEYS) {
    assert.ok(keys.includes(key), `missing module for ${key}`);
  }
});

test("polish investor CTA labels match mission copy", () => {
  const wm = pl.workspaceModules;
  for (let i = 0; i < INVESTOR_CTA_KEYS.length; i++) {
    const key = INVESTOR_CTA_KEYS[i];
    const label = wm[key as keyof typeof wm];
    assert.equal(label, PL_LABELS[i], key);
  }
  for (const locale of ["en"] as const) {
    for (const key of INVESTOR_CTA_KEYS) {
      const label = dictionaries[locale].workspaceModules[key as keyof (typeof dictionaries)["en"]["workspaceModules"]];
      assert.ok(label && label.length > 2, `${locale}.${key}`);
    }
  }
});
