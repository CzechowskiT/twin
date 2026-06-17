/**
 * System-of-record route consistency — kernel IDs align with route registry (20 assertions).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_COLLABORATION_DEMO_ID } from "../src/lib/candidate-collaboration-demo-data";
import { CANDIDATE_TRUST_CENTER_DEMO_ID } from "../src/lib/candidate-trust-center-demo-data";
import { COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID } from "../src/lib/company-hiring-cockpit-demo-data";
import { DECISION_MEMORY_DEMO_ID } from "../src/lib/decision-memory-demo-data";
import { RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID } from "../src/lib/recruiter-daily-operating-cockpit-demo-data";
import { CANDIDATE_PROFILE_360_DEMO_ID } from "../src/lib/candidate-profile-360-demo-data";
import { CANDIDATE_TRUST_DEMO_ID } from "../src/lib/candidate-trust-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import {
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
  SAFE_COMMUNICATION_ROLE_DEMO_ID,
} from "../src/lib/safe-communication-demo-data";
import {
  TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
  TEAM_COLLABORATION_ROLE_DEMO_ID,
} from "../src/lib/team-collaboration-demo-data";
import {
  TWIN_DEMO_CANDIDATE_PRIMARY_ID,
  TWIN_DEMO_ROLE_PRIMARY_ID,
  getTwinDomainSeed,
  resolveSystemOfRecordLinks,
} from "../src/lib/system-of-record-domain";
import { candidateCollaborationHref } from "../src/lib/candidate-collaboration";
import { candidateProfile360Href } from "../src/lib/candidate-profile-360";
import { candidateTrustHref } from "../src/lib/candidate-trust";
import { jobPipelineHref } from "../src/lib/job-pipeline";
import { candidateCommunicationHref } from "../src/lib/safe-communication";
import { candidateTeamHref } from "../src/lib/team-collaboration";
import { collectSystemOfRecordHrefs, SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 all module demo candidate IDs match kernel primary", () => {
  assert.equal(CANDIDATE_PROFILE_360_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(CANDIDATE_COLLABORATION_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(CANDIDATE_TRUST_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(SAFE_COMMUNICATION_CANDIDATE_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(TEAM_COLLABORATION_CANDIDATE_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
});

test("2 all module demo role IDs match kernel primary", () => {
  assert.equal(JOB_PIPELINE_DEMO_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.equal(SAFE_COMMUNICATION_ROLE_DEMO_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
  assert.equal(TEAM_COLLABORATION_ROLE_DEMO_ID, TWIN_DEMO_ROLE_PRIMARY_ID);
});

test("3 kernel seed role links every pipeline candidate to demo-role-001", () => {
  const seed = getTwinDomainSeed();
  assert.equal(seed.role.id, TWIN_DEMO_ROLE_PRIMARY_ID);
  for (const entry of seed.pipeline_entries) {
    assert.equal(entry.role_id, TWIN_DEMO_ROLE_PRIMARY_ID);
  }
});

test("4 job pipeline href in registry uses kernel role id", () => {
  const recruiterPipeline = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_pipeline");
  assert.ok(recruiterPipeline);
  assert.equal(recruiterPipeline!.href, jobPipelineHref(TWIN_DEMO_ROLE_PRIMARY_ID, "recruiter"));
});

test("5 profile 360 href in registry uses kernel candidate id", () => {
  const recruiterProfile = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_profile_360");
  assert.ok(recruiterProfile);
  assert.equal(
    recruiterProfile!.href,
    candidateProfile360Href(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "recruiter"),
  );
});

test("6 collaboration href in registry uses kernel candidate id", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_collaboration");
  assert.ok(route);
  assert.equal(route!.href, candidateCollaborationHref(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "recruiter"));
});

test("7 trust href in registry uses kernel candidate id", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_trust");
  assert.ok(route);
  assert.equal(route!.href, candidateTrustHref(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "recruiter"));
});

test("8 team href in registry uses kernel candidate id", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_team");
  assert.ok(route);
  assert.equal(route!.href, candidateTeamHref(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "recruiter"));
});

test("9 communication href in registry uses kernel candidate id", () => {
  const route = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_communication");
  assert.ok(route);
  assert.equal(
    route!.href,
    candidateCommunicationHref(TWIN_DEMO_CANDIDATE_PRIMARY_ID, "recruiter"),
  );
});

test("10 kernel links hrefs are subset of collectSystemOfRecordHrefs paths", () => {
  const registryHrefs = new Set(collectSystemOfRecordHrefs());
  const links = resolveSystemOfRecordLinks("recruiter", {
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
  });
  for (const link of links) {
    const base = link.href.split("?")[0]?.split("#")[0] ?? link.href;
    const matched = [...registryHrefs].some((h) => h === base || base.startsWith(h));
    assert.ok(matched || registryHrefs.has(base), `unregistered href: ${link.href}`);
  }
});

test("11 founder-led demo routes reference kernel demo ids", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /demo-candidate-001/);
  assert.match(routes, /CANDIDATE_PROFILE_360_DEMO_ID/);
  assert.match(routes, /JOB_PIPELINE_DEMO_ID/);
});

test("12 demo-data files import canonical ids from kernel chain", () => {
  assert.match(read("src/lib/candidate-profile-360-demo-data.ts"), /system-of-record-domain\/constants/);
  assert.match(read("src/lib/job-pipeline-demo-data.ts"), /system-of-record-domain\/constants/);
  assert.match(read("src/lib/ats-import-readiness-demo-data.ts"), /system-of-record-domain\/constants/);
});

test("13 seed has no email or password patterns", () => {
  const blob = JSON.stringify(getTwinDomainSeed());
  assert.doesNotMatch(blob, /@/);
  assert.doesNotMatch(blob, /password|ssn/i);
});

test("14 company persona kernel links use company surface paths", () => {
  const links = resolveSystemOfRecordLinks("company", {
    candidate_id: TWIN_DEMO_CANDIDATE_PRIMARY_ID,
    role_id: TWIN_DEMO_ROLE_PRIMARY_ID,
  });
  assert.ok(links.every((l) => l.href.startsWith("/company/")));
});

test("15 pipeline seed candidate ids match job-pipeline-demo-data", () => {
  const pipeline = read("src/lib/job-pipeline-demo-data.ts");
  for (let i = 1; i <= 8; i += 1) {
    const id = `demo-candidate-${String(i).padStart(3, "0")}`;
    assert.match(pipeline, new RegExp(id));
  }
});

test("16 system-of-record-routes imports module href builders not hardcoded paths", () => {
  const routes = read("src/lib/system-of-record-routes.ts");
  assert.match(routes, /jobPipelineHref/);
  assert.match(routes, /candidateProfile360Href/);
  assert.match(routes, /candidateCollaborationHref/);
  assert.doesNotMatch(routes, /\/recruiter\/candidates\/demo-candidate-001['"]/);
});

test("17 kernel index re-exports resolvers and constants", () => {
  const index = read("src/lib/system-of-record-domain/index.ts");
  assert.match(index, /resolveTwinCandidate/);
  assert.match(index, /TWIN_DEMO_CANDIDATE_PRIMARY_ID/);
  assert.match(index, /TwinCandidate/);
  assert.match(index, /resolveRecruiterDailyCockpit/);
  assert.match(index, /resolveCompanyHiringCockpit/);
  assert.match(index, /resolveCandidateTrustCenter/);
});

test("18 #170 decision memory demo id aligns with kernel primary", () => {
  assert.equal(DECISION_MEMORY_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
});

test("19 #172/#175 cockpit demo ids align with kernel primary", () => {
  assert.equal(RECRUITER_DAILY_COCKPIT_DEMO_CANDIDATE_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  assert.equal(COMPANY_HIRING_COCKPIT_DEMO_CANDIDATE_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
});

test("20 #176 candidate trust center demo id aligns with kernel primary", () => {
  assert.equal(CANDIDATE_TRUST_CENTER_DEMO_ID, TWIN_DEMO_CANDIDATE_PRIMARY_ID);
  const cockpitDemo = read("src/lib/recruiter-daily-operating-cockpit-demo-data.ts");
  const companyDemo = read("src/lib/company-hiring-cockpit-demo-data.ts");
  assert.doesNotMatch(cockpitDemo, /system-of-record-domain/);
  assert.doesNotMatch(companyDemo, /system-of-record-domain/);
});
