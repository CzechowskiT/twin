/**
 * Recruiter & company scheduling proof panels — static guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  COMPANY_SCHEDULING_PROOF_MARKER,
  RECRUITER_SCHEDULING_PROOF_MARKER,
  resolveCompanySchedulingProof,
  resolveRecruiterSchedulingProof,
} from "../src/lib/recruiter-company-scheduling-proof";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [/calendar synced/i, /event created/i, /invite sent/i] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 recruiter cockpit workspace renders scheduling proof panel", () => {
  const ws = read("src/components/recruiter/recruiter-daily-operating-cockpit-workspace.tsx");
  assert.match(ws, /RECRUITER_DAILY_COCKPIT_MARKERS\.schedulingProof/);
  assert.match(ws, /resolveRecruiterSchedulingProof/);
});

test("2 company command center workspace renders scheduling proof panel", () => {
  const ws = read("src/components/company/company-hiring-command-center-workspace.tsx");
  assert.match(ws, /COMPANY_HIRING_COMMAND_CENTER_MARKERS\.schedulingProof/);
  assert.match(ws, /resolveCompanySchedulingProof/);
});

test("3 recruiter proof has persona items", () => {
  const record = resolveRecruiterSchedulingProof();
  assert.equal(record.persona, "recruiter");
  assert.ok(record.items.length >= 3);
});

test("4 company proof has persona items", () => {
  const record = resolveCompanySchedulingProof();
  assert.equal(record.persona, "company");
  assert.ok(record.items.length >= 3);
});

test("5 module links include calendar readiness", () => {
  const recruiterLib = read("src/lib/recruiter-daily-operating-cockpit.ts");
  const companyLib = read("src/lib/company-hiring-command-center.ts");
  assert.match(recruiterLib, /calendar\/readiness/);
  assert.match(companyLib, /calendar\/readiness/);
});

test("6 marker constants", () => {
  assert.equal(RECRUITER_SCHEDULING_PROOF_MARKER, "recruiter-daily-cockpit-scheduling-proof");
  assert.equal(COMPANY_SCHEDULING_PROOF_MARKER, "company-hiring-command-center-scheduling-proof");
});

test("7 i18n schedulingProof keys in en and pl", () => {
  assert.ok(en.schedulingProof.recruiterPanelTitle);
  assert.ok(dictionaries.pl.schedulingProof.companyPanelTitle);
});

test("8 no forbidden sync copy", () => {
  const blob =
    read("src/lib/recruiter-company-scheduling-proof-demo-data.ts") +
    JSON.stringify(en.schedulingProof);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("9 package.json exposes recruiter company calendar readiness test", () => {
  assert.match(read("package.json"), /test:recruiter-company-calendar-readiness/);
});
