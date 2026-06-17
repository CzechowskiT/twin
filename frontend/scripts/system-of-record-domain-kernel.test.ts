/**
 * TWIN System-of-Record Domain Kernel — types, seed, resolvers, adapters (20 assertions).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  TWIN_DEMO_CANDIDATE_IDS,
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
  getTwinDomainSeed,
  resolveAtsImportReadiness,
  resolveCandidateCollaboration,
  resolveCandidateProfile360,
  resolveCandidateTrust,
  resolveCandidateTrustCenter,
  resolveCompanyHiringCockpit,
  resolveDecisionMemory,
  resolveJobPipeline,
  resolveRecruiterDailyCockpit,
  resolveSafeCommunication,
  resolveSystemOfRecordLinks,
  resolveTwinCandidate,
  resolveTwinRole,
} from "../src/lib/system-of-record-domain";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "../src/lib/candidate-profile-360-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { ATS_IMPORT_READINESS_DEMO_CONNECTOR } from "../src/lib/ats-import-readiness-demo-data";
import { RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID } from "../src/lib/recruiter-daily-operating-cockpit-demo-data";
import { COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID } from "../src/lib/company-hiring-cockpit-demo-data";
import { CANDIDATE_TRUST_CENTER_DEMO_ID } from "../src/lib/candidate-trust-center-demo-data";
import { DECISION_MEMORY_DEMO_ID } from "../src/lib/decision-memory-demo-data";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 kernel exports canonical demo-candidate-001 and demo-role-001", () => {
  assert.equal(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "demo-candidate-001");
  assert.equal(TWIN_DEMO_ROLE_PRIMARY_ID, "demo-role-001");
  assert.equal(CANDIDATE_PROFILE_360_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(JOB_PIPELINE_DEMO_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
});

test("2 unified seed has eight internally consistent demo candidates", () => {
  const seed = getTwinDomainSeed();
  assert.equal(seed.candidates.length, 8);
  assert.equal(TWIN_DEMO_CANDIDATE_IDS.length, 8);
  assert.equal(seed.pipeline_entries.length, 8);
  for (const id of TWIN_DEMO_CANDIDATE_IDS) {
    assert.ok(seed.candidates.some((c) => c.id === id), id);
    assert.ok(
      seed.pipeline_entries.some(
        (e) => e.candidate_id === id && e.role_id === TWIN_DEMO_ROLE_PRIMARY_ID,
      ),
      id,
    );
  }
});

test("3 resolveTwinCandidate returns candidate for valid id", () => {
  const c = resolveTwinCandidate(TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.ok(c);
  assert.equal(c?.display_name, "Alex K. (sample)");
  assert.equal(c?.pilot_labelled, true);
});

test("4 resolveTwinCandidate returns null for invalid id", () => {
  assert.equal(resolveTwinCandidate(""), null);
  assert.equal(resolveTwinCandidate("not-a-real-candidate"), null);
});

test("5 resolveTwinRole returns role for demo-role-001", () => {
  const r = resolveTwinRole(TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.ok(r);
  assert.equal(r?.title, "Senior Product Engineer");
  assert.equal(r?.candidate_count, 8);
});

test("6 resolveTwinRole returns null for invalid id", () => {
  assert.equal(resolveTwinRole(""), null);
  assert.equal(resolveTwinRole("demo-role-999"), null);
});

test("7 resolveCandidateProfile360 adapts primary demo record", () => {
  const record = resolveCandidateProfile360(TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.ok(record);
  assert.equal(record?.id, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.ok(record?.pilot_labelled);
  assert.equal(resolveCandidateProfile360("demo-candidate-002"), null);
});

test("8 resolveJobPipeline adapts pipeline with eight candidates", () => {
  const pipeline = resolveJobPipeline(TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.ok(pipeline);
  assert.equal(pipeline?.candidates.length, 8);
  assert.equal(resolveJobPipeline("demo-role-999"), null);
});

test("9 resolveCandidateCollaboration adapts notes feedback scorecard", () => {
  const collab = resolveCandidateCollaboration(
    TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    TWIN_DEMO_ROLE_PRIMARY_ID,
  );
  assert.ok(collab);
  assert.equal(collab?.scorecard.length, 9);
  assert.equal(resolveCandidateCollaboration("invalid", TWIN_DEMO_ROLE_PRIMARY_ID), null);
});

test("10 resolveCandidateTrust adapts consent and contact history", () => {
  const trust = resolveCandidateTrust(TWIN_DEMO_CANDIDATE_PRIMARY_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.ok(trust);
  assert.ok(trust?.contact_history.length >= 2);
  assert.equal(resolveCandidateTrust("invalid"), null);
});

test("11 resolveSafeCommunication adapts draft-only record", () => {
  const comm = resolveSafeCommunication(TWIN_DEMO_CANDIDATE_PRIMARY_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.ok(comm);
  assert.equal(comm?.communication_status, "draft_only");
  assert.ok(comm?.drafts.length >= 1);
});

test("12 resolveAtsImportReadiness adapts mapping pilot connector", () => {
  const ats = resolveAtsImportReadiness(ATS_IMPORT_READINESS_DEMO_CONNECTOR);
  assert.ok(ats);
  assert.equal(ats?.sample_candidate.candidate_id, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(resolveAtsImportReadiness("unknown-connector"), null);
});

test("13 resolveDecisionMemory returns cross-module audit events", () => {
  const dm = resolveDecisionMemory(TWIN_DEMO_CANDIDATE_PRIMARY_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.ok(dm);
  assert.ok(dm!.events.length >= 3);
  assert.ok(dm!.events.some((e) => e.source_module === "job_pipeline"));
  assert.equal(resolveDecisionMemory("x", TWIN_DEMO_ROLE_PRIMARY_ID), null);
});

test("14 resolveSystemOfRecordLinks returns recruiter module links", () => {
  const links = resolveSystemOfRecordLinks("recruiter", {
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
  });
  assert.ok(links.length >= 7);
  assert.ok(links.every((l) => l.href.startsWith("/")));
  assert.ok(links.some((l) => l.module_family === "pipeline"));
});

test("15 resolveSystemOfRecordLinks returns empty for candidate persona", () => {
  assert.equal(resolveSystemOfRecordLinks("candidate").length, 0);
});

test("16 types module defines all required domain entities", () => {
  const types = read("src/lib/system-of-record-domain/types.ts");
  for (const name of [
    "TwinCandidate",
    "TwinRole",
    "TwinApplication",
    "TwinMatch",
    "TwinPipelineStage",
    "TwinPipelineEntry",
    "TwinNote",
    "TwinFeedback",
    "TwinScorecard",
    "TwinScorecardCriterion",
    "TwinConsentRecord",
    "TwinContactHistoryEvent",
    "TwinTeamTask",
    "TwinCommunicationDraft",
    "TwinAtsImportRecord",
    "TwinDecisionMemoryEvent",
    "TwinEvidenceItem",
    "TwinSystemOfRecordLink",
    "TwinModuleStatus",
    "TwinBoundaryTag",
    "TwinPersona",
  ]) {
    assert.match(types, new RegExp(`export type ${name}`), name);
  }
});

test("17 hard-ban shell gate layout files were not modified by kernel", () => {
  for (const rel of FORBIDDEN_SHELL_FILES) {
    const src = read(rel);
    assert.doesNotMatch(src, /system-of-record-domain/);
    assert.doesNotMatch(src, /resolveTwinCandidate/);
  }
});

test("18 resolveRecruiterDailyCockpit adapts shipped #172 cockpit record", () => {
  const cockpit = resolveRecruiterDailyCockpit();
  assert.equal(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.ok(cockpit.priority_worklist.length >= 1);
  assert.ok(cockpit.open_decisions.length >= 1);
});

test("19 resolveCompanyHiringCockpit adapts shipped #175 cockpit record", () => {
  const cockpit = resolveCompanyHiringCockpit();
  assert.equal(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.ok(cockpit.candidate_shortlist.length >= 1);
});

test("20 resolveCandidateTrustCenter adapts shipped #176 trust center", () => {
  assert.equal(CANDIDATE_TRUST_CENTER_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(DECISION_MEMORY_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  const trust = resolveCandidateTrustCenter();
  assert.ok(trust);
  assert.equal(trust?.id, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(resolveCandidateTrustCenter("invalid"), null);
});
