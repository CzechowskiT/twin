import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_FUNNEL_EVENTS,
  isProductFunnelEvent,
} from "../src/lib/product-funnel-events";
import {
  PRODUCT_FUNNEL_CLIENT_ENABLED,
  TTV_MATCHES_REDIRECT_ENABLED,
} from "../src/lib/features";

test("product funnel taxonomy includes activation + north-star events", () => {
  assert.ok(PRODUCT_FUNNEL_EVENTS.includes("signup_completed"));
  assert.ok(PRODUCT_FUNNEL_EVENTS.includes("onboarding_completed"));
  assert.ok(PRODUCT_FUNNEL_EVENTS.includes("interview_scheduled"));
  assert.ok(PRODUCT_FUNNEL_EVENTS.includes("activation_ttv_matches_view"));
  assert.equal(isProductFunnelEvent("first_match"), true);
  assert.equal(isProductFunnelEvent("not_a_real_event"), false);
});

test("activation experiment flags default on", () => {
  assert.equal(TTV_MATCHES_REDIRECT_ENABLED, true);
  assert.equal(PRODUCT_FUNNEL_CLIENT_ENABLED, true);
});
