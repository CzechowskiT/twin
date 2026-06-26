/**
 * Candidate Profile 360 — route, demo data, and hard-ban guards (9 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_PROFILE_360_DEMO_ID,
  getCandidateProfile360Demo,
} from "../src/lib/candidate-profile-360-demo-data";
import {
  CANDIDATE_PROFILE_360_MARKERS,
  CANDIDATE_PROFILE_360_PAGE_MARKER,
  candidateProfile360Href,
  resolveCandidateProfile360,
} from "../src/lib/candidate-profile-360";
import { en } from "../src/lib/i18n";

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

test("1 recruiter candidate profile 360 route page exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/page.tsx")));
});

test("2 company candidate profile 360 alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/candidates/[candidateId]/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic pilot record", () => {
  const record = resolveCandidateProfile360(CANDIDATE_PROFILE_360_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_PROFILE_360_DEMO_ID);
  assert.equal(getCandidateProfile360Demo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
});

test("4 workspace component renders all 11 section markers", () => {
  const workspace = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_PROFILE_360_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.profileSummary/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.cvDocuments/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.applications/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.matches/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.notes/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.feedback/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.consent/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.decisionMemory/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.activity/);
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateProfile360("not-a-real-candidate-id"), null);
  const workspace = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(workspace, /CANDIDATE_PROFILE_360_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateProfile360\.notFoundTitle/);
});

test("6 i18n keys exist for candidate profile 360", () => {
  assert.ok(en.candidateProfile360.pageEyebrow.length > 5);
  assert.ok(en.candidateProfile360.boundaryBody.includes("auto-apply"));
  assert.ok(en.candidateProfile360.viewProfile360.length > 3);
});

test("7 safe link integration from talent radar or demo journey", () => {
  const radarClient = read("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(radarClient, /candidateProfile360Href/);
  assert.match(routes, /recruiter_profile_360/);
  assert.equal(
    candidateProfile360Href(CANDIDATE_PROFILE_360_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001",
  );
});

test("8 candidate canonical routes unchanged", () => {
  const paths = [
    "src/app/profile/page.tsx",
    "src/app/dashboard/profile/page.tsx",
    "src/app/dashboard/cv/page.tsx",
  ];
  const blob = paths.filter((p) => existsSync(join(root, p))).map((p) => read(p)).join("\n");
  assert.doesNotMatch(blob, /CandidateProfile360Workspace/);
});

test("9 shell/gate/fallback/layout files not modified by candidate profile 360", () => {
  const featurePaths = [
    "src/lib/candidate-profile-360.ts",
    "src/lib/candidate-profile-360-demo-data.ts",
    "src/components/recruiter/candidate-profile-360-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/page.tsx",
    "src/app/company/candidates/[candidateId]/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("10 profile 360 links to hiring journey by surface", () => {
  const workspace = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(workspace, /candidate-profile-360-hiring-journey-link/);
  assert.match(workspace, /hiringJourneyPersonaRoute\(surface\)/);
  assert.match(workspace, /candidateProfile360\.viewHiringJourney/);
});
