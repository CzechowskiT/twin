/**
 * Unified Decision Memory / Audit Trail — route, demo data, and hard-ban guards (19 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DECISION_MEMORY_DEMO_ID,
  getDecisionMemoryDemo,
} from "../src/lib/decision-memory-demo-data";
import {
  DECISION_MEMORY_MARKERS,
  DECISION_MEMORY_PAGE_MARKER,
  decisionMemoryHref,
  jobDecisionMemoryHref,
  resolveDecisionMemory,
} from "../src/lib/decision-memory";
import { JOB_PIPELINE_DEMO_ID } from "../src/lib/job-pipeline-demo-data";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL_FILES = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

const FORBIDDEN_COPY = [
  /email sent/i,
  /message sent/i,
  /automatic outreach/i,
  /automatic application/i,
  /auto-rejected/i,
  /AI decided/i,
  /GDPR compliant/i,
  /legally compliant/i,
  /ATS sync completed/i,
  /writeback completed/i,
  /calendar scheduled/i,
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 recruiter decision-memory route exists", () => {
  assert.ok(
    existsSync(join(root, "src/app/recruiter/candidates/[candidateId]/decision-memory/page.tsx")),
  );
});

test("2 company decision-memory route exists", () => {
  assert.ok(
    existsSync(join(root, "src/app/company/candidates/[candidateId]/decision-memory/page.tsx")),
  );
});

test("3 optional job-level decision-memory routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/recruiter/jobs/[jobId]/decision-memory/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/company/roles/[roleId]/decision-memory/page.tsx")));
});

test("4 demo-candidate-001 resolves deterministic decision memory record", () => {
  const record = resolveDecisionMemory(DECISION_MEMORY_DEMO_ID);
  assert.ok(record);
  assert.equal(record?.id, DECISION_MEMORY_DEMO_ID);
  assert.equal(getDecisionMemoryDemo().display_name, record?.display_name);
  assert.ok(record?.pilot_labelled);
  assert.equal(record?.decision_state, "shortlisted");
  assert.equal(record?.timeline.length, 11);
});

test("5 workspace renders all eight section markers", () => {
  const workspace = read("src/components/recruiter/decision-memory-workspace.tsx");
  assert.match(workspace, new RegExp(DECISION_MEMORY_PAGE_MARKER));
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.header/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.timeline/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.evidence/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.decisionState/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.blockers/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.nextActions/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.auditIntegrity/);
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.humanBoundary/);
});

test("6 invalid ids resolve to not-found marker not blank shell", () => {
  assert.equal(resolveDecisionMemory("not-a-real-candidate-id"), null);
  const workspace = read("src/components/recruiter/decision-memory-workspace.tsx");
  assert.match(workspace, /DECISION_MEMORY_MARKERS\.notFound/);
  assert.match(workspace, /GuidedEmptyState/);
  assert.match(workspace, /decisionMemory\.notFoundTitle/);
});

test("7 timeline has no final hiring decision events", () => {
  const record = getDecisionMemoryDemo();
  for (const event of record.timeline) {
    assert.equal(event.final_decision, false);
  }
  const blob = JSON.stringify(record.timeline);
  assert.doesNotMatch(blob, /hired|rejected offer|offer accepted/i);
});

test("8 i18n keys exist for decision memory layer", () => {
  assert.ok(en.decisionMemory.pageEyebrow.length > 3);
  assert.ok(en.decisionMemory.humanBoundaryBody.includes("do not decide"));
  assert.ok(en.decisionMemory.auditNoEmails.includes("No email sent"));
});

test("9 decisionMemoryHref builds correct recruiter and company paths", () => {
  assert.equal(
    decisionMemoryHref(DECISION_MEMORY_DEMO_ID),
    "/recruiter/candidates/demo-candidate-001/decision-memory",
  );
  assert.equal(
    decisionMemoryHref(DECISION_MEMORY_DEMO_ID, "company"),
    "/company/candidates/demo-candidate-001/decision-memory",
  );
  assert.equal(
    jobDecisionMemoryHref(JOB_PIPELINE_DEMO_ID),
    "/recruiter/jobs/demo-role-001/decision-memory",
  );
});

test("10 safe link integration from candidate profile 360", () => {
  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /decisionMemoryHref/);
  assert.match(profile360, /candidate-profile-360-decision-memory-link/);
});

test("11 safe link integration from job pipeline and collaboration", () => {
  const pipeline = read("src/components/recruiter/job-pipeline-workspace.tsx");
  assert.match(pipeline, /job-pipeline-decision-memory-audit-link/);
  assert.match(pipeline, /decisionMemoryHref/);
  const collaboration = read("src/components/recruiter/candidate-collaboration-workspace.tsx");
  assert.match(collaboration, /candidate-collaboration-decision-memory-link/);
});

test("12 safe link integration from trust, team, and communication", () => {
  const trust = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(trust, /candidate-trust-decision-memory-link/);
  const team = read("src/components/recruiter/team-collaboration-workspace.tsx");
  assert.match(team, /team-collaboration-decision-memory-link/);
  const comm = read("src/components/recruiter/safe-communication-workspace.tsx");
  assert.match(comm, /safe-communication-decision-memory-link/);
});

test("13 system-of-record hub registers decision memory routes", () => {
  const recruiter = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_demo_decision_memory");
  const company = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_demo_decision_memory");
  assert.ok(recruiter);
  assert.ok(company);
  assert.equal(recruiter?.href, "/recruiter/candidates/demo-candidate-001/decision-memory");
  assert.equal(company?.href, "/company/candidates/demo-candidate-001/decision-memory");
});

test("14 demo journey includes decision memory step", () => {
  const routes = read("src/lib/founder-led-demo-routes.ts");
  assert.match(routes, /decisionMemoryHref/);
  assert.match(routes, /id: "decision_memory"/);
  assert.doesNotMatch(routes, /href: "\/recruiter\/inbox"/);
});

test("15 shell/gate/fallback/layout files not modified by decision memory feature", () => {
  const featurePaths = [
    "src/lib/decision-memory.ts",
    "src/lib/decision-memory-demo-data.ts",
    "src/components/recruiter/decision-memory-workspace.tsx",
    "src/app/recruiter/candidates/[candidateId]/decision-memory/page.tsx",
    "src/app/company/candidates/[candidateId]/decision-memory/page.tsx",
  ];
  const blob = featurePaths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
  assert.doesNotMatch(blob, /LightweightRouteShell/);
  assert.doesNotMatch(blob, /PersonaWorkspaceGate/);
  assert.doesNotMatch(blob, /WorkspaceRouteLayout/);
});

test("16 decision memory copy avoids forbidden outreach/compliance claims", () => {
  const blob = [
    read("src/lib/decision-memory-demo-data.ts"),
    read("src/components/recruiter/decision-memory-workspace.tsx"),
  ].join("\n");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern} in decision memory surfaces`);
  }
});

test("17 ATS import readiness links to decision memory", () => {
  const ats = read("src/components/recruiter/ats-import-readiness-workspace.tsx");
  assert.match(ats, /ats-import-readiness-decision-memory-link/);
  assert.match(ats, /decisionMemoryHref/);
});

test("18 docs file exists for decision memory layer", () => {
  assert.ok(existsSync(join(root, "..", "docs/UNIFIED_DECISION_MEMORY_AUDIT_TRAIL_2026-06-17.md")));
});

test("19 package.json exposes decision memory test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:unified-decision-memory-audit-trail/);
  assert.match(pkg, /test:unified-decision-memory-audit-trail-browser/);
});
