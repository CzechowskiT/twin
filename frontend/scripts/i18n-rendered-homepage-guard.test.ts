/**
 * Guard against English leakage on rendered `/` and `/waitlist` copy.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  collectRenderedHomepageCopy,
  DE_EXPECTED_MARKERS,
  ENGLISH_LEAK_PHRASES,
  ES_EXPECTED_MARKERS,
} from "../src/lib/marketing/rendered-homepage-copy";

const GUARD_LOCALES = ["es", "de", "fr", "it", "zh", "ar", "ja"] as const;

test("non-EN rendered homepage/waitlist copy contains no founder-reported English leaks", () => {
  const offenders: string[] = [];
  for (const locale of GUARD_LOCALES) {
    const copy = collectRenderedHomepageCopy(locale);
    for (const leak of ENGLISH_LEAK_PHRASES) {
      if (copy.includes(leak)) {
        offenders.push(`${locale}: "${leak}"`);
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `English leakage on home/waitlist (${offenders.length}): ${offenders.slice(0, 8).join("; ")}`,
  );
});

test("Spanish rendered copy includes expected localized markers", () => {
  const copy = collectRenderedHomepageCopy("es");
  for (const marker of ES_EXPECTED_MARKERS) {
    assert.ok(copy.includes(marker), `ES missing expected marker: "${marker}"`);
  }
});

test("German rendered copy includes expected localized markers", () => {
  const copy = collectRenderedHomepageCopy("de");
  for (const marker of DE_EXPECTED_MARKERS) {
    assert.ok(copy.includes(marker), `DE missing expected marker: "${marker}"`);
  }
});
