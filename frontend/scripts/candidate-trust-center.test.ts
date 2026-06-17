/**
 * Candidate Trust Center — route, demo data, and hard-ban guards (27 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_TRUST_CENTER_DEMO_ID,
  getCandidateTrustCenterDemo,
} from "../src/lib/candidate-trust-center-demo-data";
import {
  CANDIDATE_TRUST_CENTER_MARKERS,
  CANDIDATE_TRUST_CENTER_PAGE_MARKER,
  CANDIDATE_TRUST_CENTER_ROUTE,
  CANDIDATE_TRUST_CENTER_SAFE_LINKS,
  candidateTrustCenterHref,
  resolveCandidateTrustCenter,
} from "../src/lib/candidate-trust-center";
import { CANDIDATE_CANONICAL_ROUTES } from "../src/lib/candidate-canonical-routes";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /GDPR compliant/i,
  /legally compliant/i,
  /fully compliant/i,
  /automatic outreach/i,
  /automatic application/i,
  /\bwe sent\b/i,
  /email sent/i,
  /AI decided/i,
  /AI decides/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 primary dashboard trust route exists", () => {
  assert.ok(existsSync(join(root, "src/app/dashboard/trust/page.tsx")));
});

test("2 profile trust alias route exists", () => {
  assert.ok(existsSync(join(root, "src/app/profile/trust/page.tsx")));
});

test("3 demo-candidate-001 resolves deterministic trust center record", () => {
  const record = resolveCandidateTrustCenter(CANDIDATE_TRUST_CENTER_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, CANDIDATE_TRUST_CENTER_DEMO_ID);
  assert.equal(getCandidateTrustCenterDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.role_id, JOB_PIPELINE_DEMO_ID);
});

test("4 workspace renders all ten section markers", () => {
  const workspace = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(workspace, new RegExp(CANDIDATE_TRUST_CENTER_PAGE_MARKER));
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.header/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.whatTwinKnows/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.dataSources/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.visibility/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.consentDataUse/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.communicationPreferences/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.humanDecisioning/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.candidateControls/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.trustTimeline/);
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.boundary/);
});

test("5 invalid candidate id resolves to not-found marker not blank shell", () => {
  assert.equal(resolveCandidateTrustCenter("not-a-real-candidate-id"), null);
  const workspace = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(workspace, /CANDIDATE_TRUST_CENTER_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /candidateTrustCenter\.notFoundTitle/);
});

test("6 export delete revoke disabled — no backend mutation", () => {
  const workspace = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(workspace, /disabled/);
  assert.match(workspace, /candidateTrustCenter\.exportCta/);
  assert.match(workspace, /candidateTrustCenter\.deleteCta/);
  assert.match(workspace, /candidateTrustCenter\.revokeCta/);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("7 trust timeline has no outbound sent events", () => {
  const record = getCandidateTrustCenterDemo();
  for (const event of record.trust_timeline) {
    assert.equal(event.outbound_sent, false);
  }
});

test("8 i18n keys exist for candidate trust center", () => {
  assert.ok(en.candidateTrustCenter.pageEyebrow.length > 3);
  assert.ok(en.candidateTrustCenter.notLegalAdvice.includes("not legal advice"));
  assert.ok(en.candidateTrustCenter.boundaryBody.includes("auto-apply"));
});

test("9 required safe links resolve to canonical routes", () => {
  assert.equal(candidateTrustCenterHref(), CANDIDATE_TRUST_CENTER_ROUTE);
  assert.equal(CANDIDATE_TRUST_CENTER_SAFE_LINKS.panel, CANDIDATE_CANONICAL_ROUTES.panel);
  assert.equal(CANDIDATE_TRUST_CENTER_SAFE_LINKS.jobs, "/dashboard/jobs");
  assert.equal(CANDIDATE_TRUST_CENTER_SAFE_LINKS.matches, "/dashboard/matches");
  assert.equal(CANDIDATE_TRUST_CENTER_SAFE_LINKS.profile, "/profile");
});

test("10 workspace includes required navigation links", () => {
  const workspace = read("src/components/candidate/candidate-trust-center-workspace.tsx");
  assert.match(workspace, /candidate-trust-center-profile-link/);
  assert.match(workspace, /candidate-trust-center-jobs-link/);
  assert.match(workspace, /candidate-trust-center-matches-link/);
  assert.match(workspace, /candidate-trust-center-applications-link/);
  assert.match(workspace, /candidate-trust-center-identity-link/);
});

test("11 SOR hub registry includes candidate trust entry", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "candidate_trust");
  assert.ok(entry);
  assert.equal(entry?.persona, "candidate");
  assert.equal(entry?.href, "/dashboard/trust");
  assert.equal(entry?.moduleFamily, "trust");
});

test("12 candidate canonical routes include trust", () => {
  assert.equal(CANDIDATE_CANONICAL_ROUTES.trust, "/dashboard/trust");
});

test("13 demo journey includes candidate trust center step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /candidateTrustCenterHref/);
  assert.match(routes, /id: "candidate_trust_center"/);
});

test("14 executive product proof includes candidate trust center link", () => {
  const proof = read("src/lib/executive-product-proof.ts");
  assert.match(proof, /candidateTrustCenterHref/);
  assert.match(proof, /id: "candidate_trust_center"/);
});

test("15 candidate workspace subnav links to trust center", () => {
  const subnav = read("src/components/candidate-workspace-subnav.tsx");
  assert.match(subnav, /\/dashboard\/trust/);
});

test("16 jobs matches profile routes unchanged — distinct surfaces", () => {
  const jobs = read("src/app/dashboard/jobs/page.tsx");
  const matches = read("src/app/dashboard/matches/page.tsx");
  const profile = read("src/app/profile/page.tsx");
  const blob = [jobs, matches, profile].join("\n");
  assert.doesNotMatch(blob, /CandidateTrustCenterWorkspace/);
});

test("17 shell/gate/fallback/layout files not modified by trust center feature", () => {
  const featurePaths = [
    "src/lib/candidate-trust-center.ts",
    "src/lib/candidate-trust-center-demo-data.ts",
    "src/components/candidate/candidate-trust-center-workspace.tsx",
    "src/app/dashboard/trust/page.tsx",
    "src/app/profile/trust/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("18 trust center copy avoids forbidden legal/outreach claims", () => {
  const blob = [
    read("src/lib/candidate-trust-center-demo-data.ts"),
    read("src/components/candidate/candidate-trust-center-workspace.tsx"),
    JSON.stringify(en.candidateTrustCenter),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in trust center surfaces`);
  }
});

test("19 docs file exists for candidate trust center", () => {
  assert.ok(existsSync(join(root, "..", "docs/CANDIDATE_TRUST_CENTER_2026-06-17.md")));
});

test("20 package.json exposes trust center test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:candidate-trust-center/);
  assert.match(pkg, /test:candidate-trust-center-browser/);
});

test("21 P0 candidate routes include trust center", () => {
  const p0 = read("e2e/helpers/p0-no-headless-final-state.ts");
  assert.match(p0, /\/dashboard\/trust/);
  assert.match(p0, /data-candidate-trust-center-page/);
});

test("22 milestone ms-4 marked done", () => {
  const data = read("src/lib/executive-product-proof-demo-data.ts");
  assert.match(data, /id: "ms-4"[\s\S]*status: "done"/);
});

test("23 controls remain disabled on pilot record", () => {
  const record = getCandidateTrustCenterDemo();
  assert.equal(record.controls_export_disabled, true);
  assert.equal(record.controls_delete_disabled, true);
});

test("24 momentum rail PL copy is complete — not truncated mid-word", () => {
  const plLead = dictionaries.pl.site.momentumLead;
  assert.match(plLead, /heroicznym szukaniem pracy raz w tygodniu/i);
  assert.doesNotMatch(plLead, /heroicz szukaniem/i);
  assert.ok(plLead.endsWith("."));
});

test("25 momentum rail EN copy is complete", () => {
  const enLead = en.site.momentumLead;
  assert.match(enLead, /heroic once-a-week job hunts/i);
  assert.ok(enLead.endsWith("."));
});

test("26 trust center PL boundary body is full readable sentence", () => {
  const boundary = dictionaries.pl.candidateTrustCenter.boundaryBody;
  assert.match(boundary, /bez auto-apply/i);
  assert.match(boundary, /bez automatycznego outreachu/i);
  assert.ok(boundary.length > 120);
});

test("27 momentum rail component does not clamp or truncate lead copy", () => {
  const rail = read("src/components/page-momentum-rail.tsx");
  assert.doesNotMatch(rail, /line-clamp|truncate|overflow-hidden/);
  assert.match(rail, /site\.momentumLead/);
  assert.match(rail, /break-words/);
});
