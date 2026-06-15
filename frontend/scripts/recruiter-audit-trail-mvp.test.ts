import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  RECRUITER_AUDIT_ACTION_TYPES,
  RECRUITER_AUDIT_ALLOWED_META_KEYS,
  RECRUITER_AUDIT_FORBIDDEN_META_KEYS,
  formatRecruiterAuditTimestamp,
  recruiterAuditActionLabelKey,
  sanitizeRecruiterAuditMeta,
} from "../src/lib/recruiter-audit-trail";

test("audit action types cover accept, decline, review opened, and radar", () => {
  assert.deepEqual([...RECRUITER_AUDIT_ACTION_TYPES].sort(), [
    "decision_accept",
    "decision_decline",
    "radar_dismissed",
    "radar_draft_prepared",
    "radar_review_card_opened",
    "radar_shortlisted",
    "radar_snoozed",
    "review_opened",
  ]);
});

test("sanitize meta drops decline notes and candidate identifiers", () => {
  const clean = sanitizeRecruiterAuditMeta({
    source: "review_card",
    status_before: "applied",
    decline_note: "hidden",
    candidate_name: "Alex",
    email: "alex@example.com",
    junk: "drop",
  });
  assert.deepEqual(clean, { source: "review_card", status_before: "applied" });
  for (const key of RECRUITER_AUDIT_FORBIDDEN_META_KEYS) {
    assert.ok(!(key in clean));
  }
  for (const key of Object.keys(clean)) {
    assert.ok((RECRUITER_AUDIT_ALLOWED_META_KEYS as readonly string[]).includes(key));
  }
});

test("action labels map to recruiterAudit i18n keys", () => {
  assert.equal(recruiterAuditActionLabelKey("decision_accept"), "recruiterAudit.actionDecisionAccept");
  assert.equal(recruiterAuditActionLabelKey("decision_decline"), "recruiterAudit.actionDecisionDecline");
  assert.equal(recruiterAuditActionLabelKey("review_opened"), "recruiterAudit.actionReviewOpened");
});

test("timestamp formatter returns locale-aware text", () => {
  const formatted = formatRecruiterAuditTimestamp("2026-06-11T12:00:00.000Z", "en");
  assert.ok(formatted.length > 4);
  assert.equal(formatRecruiterAuditTimestamp("", "en"), "");
});

test("panel and i18n include Historia działań trust copy", () => {
  const panel = fs.readFileSync("src/components/recruiter/recruiter-audit-trail-panel.tsx", "utf8");
  assert.match(panel, /recruiterAudit\.title/);
  assert.match(panel, /recruiterAudit\.trustNote/);
  const i18n = fs.readFileSync("src/lib/i18n.ts", "utf8");
  assert.match(i18n, /recruiterAudit:/);
  assert.match(i18n, /Historia działań/);
  assert.match(i18n, /AI nie podejmuje decyzji rekrutacyjnych/);
  assert.match(i18n, /Audit trail records recruiter actions/);
});
