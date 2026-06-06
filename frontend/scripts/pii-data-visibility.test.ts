import assert from "node:assert/strict";
import test from "node:test";

import { showConsentReceipt } from "../src/components/dashboard/application-consent-receipt";
import {
  recruiterDataVisibilityContext,
  recruiterDataVisibilitySummary,
} from "../src/lib/recruiter-data-visibility";
import { en } from "../src/lib/i18n";

test("consent receipt shown for applied, pending, interview only", () => {
  assert.equal(showConsentReceipt("applied"), true);
  assert.equal(showConsentReceipt("pending"), true);
  assert.equal(showConsentReceipt("interview"), true);
  assert.equal(showConsentReceipt("rejected"), false);
  assert.equal(showConsentReceipt("hired"), false);
});

test("recruiter visibility summary prefers API field", () => {
  assert.equal(
    recruiterDataVisibilitySummary({
      data_visibility_summary: "Application review — name visible.",
    }),
    "Application review — name visible.",
  );
  assert.equal(recruiterDataVisibilitySummary({}), null);
});

test("recruiter visibility context falls back to pii_context", () => {
  assert.equal(
    recruiterDataVisibilityContext({ data_visibility_context: "application_review" }),
    "application_review",
  );
  assert.equal(recruiterDataVisibilityContext({ pii_context: "application_review" }), "application_review");
});

test("candidate consent receipt copy does not claim delegated apply or full CV share", () => {
  const body = en.dashboard.consentReceiptBody.toLowerCase();
  assert.match(body, /employer site|employer's site/);
  assert.doesNotMatch(body, /delegated submit|auto-submit/);
  assert.doesNotMatch(en.dashboard.consentReceiptHiddenCv.toLowerCase(), /shared in inbox/);
});

test("recruiter inbox visibility note does not claim anonymized inbox", () => {
  const note = en.recruiterInbox.dataVisibilityNote;
  assert.match(note.toLowerCase(), /application review|name/);
  assert.doesNotMatch(note.toLowerCase(), /fully anonymized|no names/);
});
