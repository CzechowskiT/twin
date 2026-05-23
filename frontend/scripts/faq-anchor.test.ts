import assert from "node:assert/strict";

import {
  FAQ_INVESTOR_ANCHOR_ID,
  FAQ_INVESTOR_HREF,
  faqSectionFromLocation,
  isFaqSectionId,
} from "../src/lib/faq-anchor";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (e) {
    console.error(`fail ${name}`, e);
    process.exitCode = 1;
  }
}

run("investor href", () => {
  assert.equal(FAQ_INVESTOR_HREF, "/faq#investor-faq");
});

run("hash selects investors", () => {
  assert.equal(faqSectionFromLocation(null, `#${FAQ_INVESTOR_ANCHOR_ID}`), "investors");
});

run("query selects investors", () => {
  assert.equal(faqSectionFromLocation("investors", ""), "investors");
});

run("invalid section ignored", () => {
  assert.equal(faqSectionFromLocation("not-a-section", ""), null);
});

run("isFaqSectionId", () => {
  assert.equal(isFaqSectionId("investors"), true);
  assert.equal(isFaqSectionId("foo"), false);
});
