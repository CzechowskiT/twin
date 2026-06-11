import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries, LOCALES } from "../src/lib/i18n";
import {
  buildRecruiterInviteMessage,
  defaultManualSlotInput,
  isRecruiterSchedulingEligible,
  recruiterSchedulingInviteIsSafe,
} from "../src/lib/recruiter-scheduling";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

const schedulingSource = readFileSync(join(srcRoot, "lib/recruiter-scheduling.ts"), "utf8");
const panelSource = readFileSync(join(srcRoot, "components/recruiter/recruiter-scheduling-panel.tsx"), "utf8");
const inboxSource = readFileSync(join(srcRoot, "app/recruiter/inbox/recruiter-inbox-client.tsx"), "utf8");
const calendarPage = readFileSync(join(srcRoot, "app/recruiter/calendar/page.tsx"), "utf8");
const recruiterApi = readFileSync(join(root, "../backend/app/api/recruiter.py"), "utf8");
const schedulingService = readFileSync(join(root, "../backend/app/services/recruiter_scheduling.py"), "utf8");

test("scheduling action only for accepted / to_contact pipeline rows", () => {
  assert.equal(isRecruiterSchedulingEligible({ status: "interview", pipeline_status: "accepted" }), true);
  assert.equal(isRecruiterSchedulingEligible({ status: "interview", pipeline_status: "to_contact" }), true);
  assert.equal(isRecruiterSchedulingEligible({ status: "applied", pipeline_status: "review" }), false);
  assert.equal(isRecruiterSchedulingEligible({ status: "rejected", pipeline_status: "rejected" }), false);
});

test("manual slot fields and copyable invite exist in scheduling UI", () => {
  for (const key of ["slotDate", "slotTime", "copyButton"] as const) {
    assert.match(panelSource, new RegExp(`RECRUITER_SCHEDULING_VISUAL_MARKERS.${key}`));
  }
  const invite = buildRecruiterInviteMessage(
    { candidate_name: "Alex Kowalski", job_title: "Engineer", company: "Nova" },
    { ...defaultManualSlotInput(), slotDate: "2026-06-15", slotTime: "14:30" },
    "en",
  );
  assert.match(invite, /Alex/);
  assert.match(invite, /2026-06-15/);
});

test("not synced and not sent disclaimers are present", () => {
  assert.match(en.recruiterScheduling.trustLabel, /does not sync recruiter calendar/i);
  assert.match(en.recruiterScheduling.notSentDisclaimer, /does not send/i);
  assert.match(en.recruiterScheduling.calendarSyncNotLive, /not live/i);
});

test("no recruiter calendar provider API calls in scheduling code", () => {
  const blob = [schedulingSource, panelSource, inboxSource, schedulingService, recruiterApi].join("\n");
  assert.doesNotMatch(blob, /google_calendar|microsoft_calendar|insert_calendar_event/i);
});

test("no email sending in recruiter scheduling path", () => {
  const blob = [schedulingSource, panelSource, schedulingService, recruiterApi].join("\n");
  assert.doesNotMatch(blob, /send_mail|send_email|smtp/i);
});

test("recruiter calendar page remains NOT LIVE placeholder", () => {
  assert.match(calendarPage, /recruiterCalendar\.notLiveTitle/);
});

test("PII unchanged — invite uses first name only", () => {
  const invite = buildRecruiterInviteMessage(
    { candidate_name: "Alex Kowalski", job_title: "Engineer", company: "Nova" },
    { ...defaultManualSlotInput(), slotDate: "15 June 2026", slotTime: "14:30" },
    "en",
  );
  assert.ok(recruiterSchedulingInviteIsSafe(invite));
  assert.doesNotMatch(invite, /@/);
});

test("recruiterScheduling i18n keys exist for all locales", () => {
  const keys = Object.keys(en.recruiterScheduling);
  for (const locale of LOCALES) {
    const section = dictionaries[locale].recruiterScheduling;
    for (const key of keys) {
      assert.ok(section[key as keyof typeof section]?.trim(), `${locale} missing recruiterScheduling.${key}`);
    }
  }
});
