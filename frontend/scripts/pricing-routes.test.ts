import assert from "node:assert/strict";
import test from "node:test";

import {
  employerPricingHref,
  isPersonaPricingPath,
  pricingHrefForPersona,
} from "../src/lib/pricing-routes";

test("pricingHrefForPersona maps lanes with pricing anchor", () => {
  assert.equal(pricingHrefForPersona("candidate"), "/for-candidates#persona-pricing");
  assert.equal(pricingHrefForPersona("recruiter"), "/for-recruiters#persona-pricing");
  assert.equal(pricingHrefForPersona("company"), "/for-companies#persona-pricing");
  assert.equal(employerPricingHref(), "/for-companies#persona-pricing");
});

test("isPersonaPricingPath covers Cennik and persona lanes", () => {
  assert.equal(isPersonaPricingPath("/pricing"), true);
  assert.equal(isPersonaPricingPath("/for-recruiters"), true);
  assert.equal(isPersonaPricingPath("/for-employers/pricing"), true);
  assert.equal(isPersonaPricingPath("/dashboard"), false);
});
