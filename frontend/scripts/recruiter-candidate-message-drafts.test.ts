import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildRecruiterMessageDraftContext,
  isRecruiterMessageDraftEligible,
  recruiterMessageDraftIsSafe,
  recruiterMessageDraftUsesOnlySafeFields,
  renderRecruiterMessageDraft,
} from "../src/lib/recruiter-message-drafts";
import { isRecruiterInboxActionable } from "../src/lib/recruiter-inbox-decision";
import { en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientSrc = readFileSync(
  join(root, "src/app/recruiter/inbox/recruiter-inbox-client.tsx"),
  "utf8",
);
const panelSrc = readFileSync(
  join(root, "src/components/recruiter/recruiter-message-draft-panel.tsx"),
  "utf8",
);
const libSrc = readFileSync(join(root, "src/lib/recruiter-message-drafts.ts"), "utf8");

test("prepare message action only for accepted / to_contact rows", () => {
  assert.equal(isRecruiterMessageDraftEligible("interview"), true);
  assert.equal(isRecruiterMessageDraftEligible("to_contact"), true);
  assert.equal(isRecruiterMessageDraftEligible("applied"), false);
  assert.equal(isRecruiterMessageDraftEligible("pending"), false);
  assert.equal(isRecruiterMessageDraftEligible("rejected"), false);
  assert.match(clientSrc, /isRecruiterMessageDraftEligible/);
  assert.match(clientSrc, /RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS\.prepareButton/);
});

test("draft panel clearly marked as not sent automatically", () => {
  assert.match(panelSrc, /recruiterMessageDrafts\.notSentBanner/);
  assert.match(panelSrc, /recruiterMessageDrafts\.twinNoSendDisclaimer/);
  assert.match(panelSrc, /RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS\.notSentBanner/);
  assert.equal(pl.recruiterMessageDrafts.notSentBanner, "Szkic wiadomości — nie wysłano automatycznie");
  assert.equal(en.recruiterMessageDrafts.twinNoSendDisclaimer, "TWIN does not send this message on your behalf");
});

test("copy button exists with trust labels", () => {
  assert.match(panelSrc, /navigator\.clipboard\.writeText/);
  assert.match(panelSrc, /RECRUITER_MESSAGE_DRAFT_VISUAL_MARKERS\.copyButton/);
  assert.match(panelSrc, /recruiterMessageDrafts\.copy/);
  assert.match(panelSrc, /recruiterMessageDrafts\.editBeforeSendHint/);
  assert.equal(pl.recruiterMessageDrafts.copy, "Skopiuj");
  assert.equal(pl.recruiterMessageDrafts.editBeforeSendHint, "Edytuj przed wysłaniem");
});

test("draft templates avoid hidden PII and salary fields", () => {
  const row = {
    application_id: 42,
    job_title: "Senior Engineer",
    company: "Nova Hiring PL",
    candidate_name: "Jan Kowalski",
    status: "interview",
    candidate_email: "jan.secret@example.com",
    candidate_phone: "+48 600 100 200",
    salary_min: 20000,
    salary_max: 28000,
    cv_text: "Confidential CV paragraph with private history",
  };
  assert.equal(recruiterMessageDraftUsesOnlySafeFields(row), true);
  const ctx = buildRecruiterMessageDraftContext(row);
  const draft = renderRecruiterMessageDraft("invitation", ctx, "pl");
  assert.match(draft.subject, /Senior Engineer/);
  assert.match(draft.body, /Jan/);
  assert.doesNotMatch(draft.body, /jan\.secret@example\.com/i);
  assert.doesNotMatch(draft.body, /600 100 200/);
  assert.doesNotMatch(`${draft.subject}\n${draft.body}`.toLowerCase(), /salary|pln|wynagrod/);
  assert.equal(recruiterMessageDraftIsSafe("Hello Jan, role at Nova"), true);
  assert.equal(recruiterMessageDraftIsSafe("Contact jan@test.com"), false);
});

test("accept and decline controls unchanged for actionable rows", () => {
  assert.equal(isRecruiterInboxActionable("applied"), true);
  assert.match(clientSrc, /respond\(r\.application_id, "accept"\)/);
  assert.match(clientSrc, /respond\(r\.application_id, "decline"/);
  assert.match(clientSrc, /recruiterInbox\.accept/);
  assert.match(clientSrc, /recruiterInbox\.decline/);
});

test("no auto-send or email provider code path in message drafts feature", () => {
  const blob = `${libSrc}\n${panelSrc}\n${clientSrc}`.toLowerCase();
  assert.doesNotMatch(blob, /nodemailer|sendgrid|mailgun|gmail\.send|microsoft\.graph.*sendmail/);
  assert.doesNotMatch(blob, /auto-?send|sendemail|smtp/);
  assert.doesNotMatch(libSrc, /fetch\(/);
});

test("forbidden live-automation claims absent from draft copy", () => {
  for (const locale of [en, pl]) {
    const blob = JSON.stringify(locale.recruiterMessageDrafts).toLowerCase();
    assert.doesNotMatch(blob, /auto-apply is live/);
    assert.doesNotMatch(blob, /delegated apply is live/);
    assert.doesNotMatch(blob, /applies automatically/);
    assert.doesNotMatch(blob, /guaranteed interview/);
  }
});
