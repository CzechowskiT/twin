/**
 * ATS Import / Connector Readiness — route, demo data, and hard-ban guards (21 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ATS_IMPORT_READINESS_DEMO_CONNECTOR,
  ATS_IMPORT_SAMPLE_CANDIDATE_ID,
  ATS_IMPORT_SAMPLE_ROLE_ID,
  getAtsImportReadinessDemo,
} from "../src/lib/ats-import-readiness-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import {
  atsImportReadinessHref,
  atsIntegrationsHref,
  isValidAtsImportView,
  resolveAtsImportReadiness,
  ATS_IMPORT_READINESS_MARKERS,
  ATS_IMPORT_READINESS_PAGE_MARKER,
} from "../src/lib/ats-import-readiness";
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

test("1 recruiter import-readiness route exists", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/integrations/ats/import-readiness/page.tsx")));
});

test("2 company import-readiness route exists", () => {
  assert.ok(existsSync(join(root, "src/app/company/integrations/ats/import-readiness/page.tsx")));
});

test("3 recruiter mapping and deduplication routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/integrations/ats/mapping/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/recruiter/integrations/ats/deduplication/page.tsx")));
});

test("4 company mapping route and company ats hub exist", () => {
  assert.ok(existsSync(join(root, "src/app/company/integrations/ats/mapping/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/integrations/ats/page.tsx")));
});

test("5 demo connector resolves deterministic import readiness record", () => {
  const record = resolveAtsImportReadiness();
  assert.ok(record);
  assert.equal(record?.connector_id, ATS_IMPORT_READINESS_DEMO_CONNECTOR);
  assert.equal(getAtsImportReadinessDemo().pilot_labelled, true);
  assert.ok(record?.no_live_sync);
  assert.ok(record?.no_writeback);
});

test("6 sample candidate demo-candidate-001 links to demo-role-001", () => {
  const record = resolveAtsImportReadiness();
  assert.equal(record?.sample_candidate.candidate_id, ATS_IMPORT_SAMPLE_CANDIDATE_ID);
  assert.equal(record?.sample_candidate.role_id, ATS_IMPORT_SAMPLE_ROLE_ID);
  assert.equal(ATS_IMPORT_SAMPLE_ROLE_ID, JOB_PIPELINE_DEMO_ID);
});

test("7 workspace renders all ten section markers", () => {
  const workspace = read("src/components/recruiter/ats-import-readiness-workspace.tsx");
  assert.match(workspace, new RegExp(ATS_IMPORT_READINESS_PAGE_MARKER));
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.header/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.connectorMatrix/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.fieldMapping/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.dedupePreview/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.consentMapping/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.validationChecklist/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.riskFlags/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.sampleCandidate/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.auditTrail/);
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.humanReviewBoundary/);
});

test("8 invalid company deduplication view shows not-found marker", () => {
  assert.equal(isValidAtsImportView("deduplication", "company"), false);
  assert.equal(isValidAtsImportView("deduplication", "recruiter"), true);
  const workspace = read("src/components/recruiter/ats-import-readiness-workspace.tsx");
  assert.match(workspace, /ATS_IMPORT_READINESS_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
});

test("9 catch-all invalid ats subroutes exist for recruiter and company", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/integrations/ats/[...rest]/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/integrations/ats/[...rest]/page.tsx")));
});

test("10 i18n keys exist for ats import readiness layer", () => {
  assert.ok(en.atsImportReadiness.pageEyebrow.length > 3);
  assert.ok(en.atsImportReadiness.boundaryBody.includes("no live ATS sync"));
  assert.ok(en.atsImportReadiness.boundaryBody.includes("no ATS writeback"));
  assert.ok(en.atsImportReadiness.humanReviewRequired.includes("Human review required"));
});

test("11 integrations link to import readiness workspace", () => {
  const recruiter = read("src/lib/recruiter-integrations-readiness.ts");
  assert.match(recruiter, /\/recruiter\/integrations\/ats\/import-readiness/);
  const company = read("src/lib/company-integrations-readiness.ts");
  assert.match(company, /\/company\/integrations\/ats\/import-readiness/);
  assert.equal(atsImportReadinessHref("recruiter"), "/recruiter/integrations/ats/import-readiness");
  assert.equal(atsIntegrationsHref("company"), "/company/integrations/ats");
});

test("12 talent pool import links to ats import readiness", () => {
  const importClient = read("src/app/recruiter/talent-pool/import/recruiter-talent-pool-import-client.tsx");
  assert.match(importClient, /talent-pool-import-ats-readiness-link/);
  assert.match(importClient, /atsImportReadinessHref/);
});

test("13 profile 360 activity links to import readiness", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /candidate-profile-360-import-readiness-link/);
  assert.match(profile360, /atsImportReadinessHref/);
});

test("14 trust data source ats_import links to import readiness", () => {
  const trust = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(trust, /candidate-trust-import-readiness-link/);
  assert.match(trust, /data_source === "ats_import"/);
});

test("15 demo journey includes ats import readiness step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /ats_import_readiness/);
  assert.match(routes, /atsImportReadinessHref/);
});

test("16 validation checklist has eight items in demo data", () => {
  const demo = getAtsImportReadinessDemo();
  assert.equal(demo.validation_checklist.length, 8);
  assert.equal(demo.field_mappings.length >= 6, true);
  assert.equal(demo.dedupe_rules.length, 5);
});

test("17 demo data file has no real PII email patterns", () => {
  const demo = read("src/lib/ats-import-readiness-demo-data.ts");
  assert.match(demo, /pilot_labelled: true/);
  assert.match(demo, /no_live_sync: true/);
  assert.doesNotMatch(demo, /[a-z0-9._%+-]+@(?!example\.invalid)[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("18 forbidden copy not present in workspace source", () => {
  const workspace = read("src/components/recruiter/ats-import-readiness-workspace.tsx");
  const forbidden = [
    "ATS sync enabled",
    "live sync",
    "writeback enabled",
    "credentials saved",
    "import completed",
    "GDPR compliant",
    "legally compliant",
    "automatic outreach",
    "email sent",
    "message sent",
  ];
  const lower = workspace.toLowerCase();
  for (const phrase of forbidden) {
    assert.doesNotMatch(lower, new RegExp(phrase.replace(/\s/g, "\\s"), "i"));
  }
});

test("19 required boundary phrases present in i18n", () => {
  const required = [
    "import readiness",
    "not live",
    "no live ATS sync",
    "no ATS writeback",
    "human review required",
    "privacy review required",
    "demo-only",
    "no automatic outreach",
  ];
  const blob = JSON.stringify(en.atsImportReadiness).toLowerCase();
  for (const phrase of required) {
    assert.match(blob, new RegExp(phrase.replace(/-/g, "[-\\s]").toLowerCase()));
  }
});

test("20 shell/gate/fallback/layout files not referenced by feature", () => {
  const featurePaths = [
    "src/lib/ats-import-readiness.ts",
    "src/lib/ats-import-readiness-demo-data.ts",
    "src/components/recruiter/ats-import-readiness-workspace.tsx",
    "src/app/recruiter/integrations/ats/import-readiness/page.tsx",
    "src/app/company/integrations/ats/import-readiness/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("21 workspace has no fetch or external API calls", () => {
  const workspace = read("src/components/recruiter/ats-import-readiness-workspace.tsx");
  assert.doesNotMatch(workspace, /fetch\(/);
  assert.doesNotMatch(workspace, /apiFetch/);
});
