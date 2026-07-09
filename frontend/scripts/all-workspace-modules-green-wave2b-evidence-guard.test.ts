/**
 * Wave 2B Slice 1 — candidate evidence MAKE_GREEN static guard (2026-07-09).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GREEN_WORKSPACE_ALLOWED_IDS,
  isWorkspaceGreenVisible,
  WAVE1_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT,
  WAVE2B_EVIDENCE_ALWAYS_IN_HUB,
  WAVE2B_MAKE_GREEN_MODULE_ID,
  WAVE2B_MAKE_GREEN_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { CANDIDATE_EVIDENCE_ROUTE } from "../src/lib/candidate-evidence-vault";
import {
  CANDIDATE_READINESS_COMPLETION_ROUTES,
  CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED,
} from "../src/lib/candidate-readiness-working-flow";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { EVIDENCE_VAULT_SHIP_STATUS } from "../src/lib/seven-day-d2-candidate";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE2B_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE2B_EVIDENCE_2026-07-09.md";
const READINESS_FLOW_DOC = "docs/CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md";

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave2b evidence doc exists with stance and selected module", () => {
  const doc = readRepo(WAVE2B_DOC);
  assert.match(doc, /Wave 2B/i);
  assert.match(doc, /WAVE2B_MAKE_GREEN_MODULE: evidence/);
  assert.match(doc, /WAVE2B_BACK_IN_HUB: true/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave2b gate exports — evidence green, hidden count unchanged", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE2B_MAKE_GREEN_MODULE_ID, "evidence");
  assert.deepEqual(WAVE2B_MAKE_GREEN_SOR_IDS, ["evidence", "candidate_evidence"]);
  assert.equal(WAVE2B_EVIDENCE_ALWAYS_IN_HUB, true);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.equal(WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("evidence"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.candidate.includes("candidate_evidence"));
});

test("3 seven-day-d2 — evidence live, visible in hub", () => {
  assert.equal(EVIDENCE_VAULT_SHIP_STATUS, "live");
  assert.equal(shouldHideFromDefaultHub("candidate", "evidence"), false);
  assert.equal(classifyProductSurfaceTier("candidate", "evidence"), "LIVE");
});

test("4 candidate workspace — evidence primary live, non-green hidden", () => {
  const split = splitWorkspaceModules("candidate", CANDIDATE_WORKSPACE_MODULES);
  const evidence = split.primary.find((m) => m.id === "evidence");
  assert.ok(evidence);
  assert.equal(evidence?.status, "live");
  assert.equal(split.primary.filter((m) => m.status === "live").length, 9);
  assert.ok(split.primary.length <= WORKSPACE_GREEN_PRIMARY_LIMITS.candidate);
  assert.equal(split.roadmap.length, 0);
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(split.hidden.some((m) => m.id === "referrals"));
  assert.ok(split.hidden.some((m) => m.id === "trust_center"));
});

test("5 evidence page — manual vault UX, readiness banner, missing checklist", () => {
  const client = read("src/app/dashboard/evidence/candidate-evidence-client.tsx");
  assert.match(client, /EVIDENCE_VAULT_SHIP_STATUS/);
  assert.match(client, /\/api\/v1\/candidates\/me\/evidence/);
  assert.match(client, /CandidateReadinessFlowBanner/);
  assert.match(client, /skill_evidence/);
  assert.match(client, /missingChecklistTitle/);
  assert.match(client, /recruiterSummaryTitle/);
  assert.doesNotMatch(client, /auto-upload/i);
  assert.doesNotMatch(client, /verified label/i);
});

test("6 M5 readiness — skill_evidence links to evidence route, delegated off", () => {
  assert.equal(CANDIDATE_READINESS_COMPLETION_ROUTES.skill_evidence, CANDIDATE_EVIDENCE_ROUTE);
  assert.equal(CANDIDATE_EVIDENCE_ROUTE, "/dashboard/evidence");
  assert.equal(CANDIDATE_READINESS_DELEGATED_APPLY_ENABLED, false);

  const card = read("src/components/dashboard/dashboard-verified-readiness-card.tsx");
  assert.match(card, /skill_evidence_present/);
  assert.match(card, /CANDIDATE_READINESS_COMPLETION_ROUTES/);
  assert.match(card, /delegatedBlocked/);

  const flowDoc = readRepo(READINESS_FLOW_DOC);
  assert.match(flowDoc, /\/dashboard\/evidence/);
  assert.match(flowDoc, /skill_evidence_present/);
});

test("7 SoR evidence route status live", () => {
  const routes = getSystemOfRecordRoutesForPersona("candidate");
  const evidence = routes.find((r) => r.id === "candidate_evidence");
  assert.ok(evidence);
  assert.equal(evidence?.status, "live");
  assert.equal(evidence?.href, "/dashboard/evidence");
});

test("8 honest copy — no auto-upload or AI claims in evidence strings", () => {
  const lead = en.candidateEvidence.lead ?? "";
  const scope = en.candidateEvidence.scopeNote ?? "";
  const hubValue = en.workspaceModules.candidateEvidenceValue ?? "";
  assert.match(lead, /manually/i);
  assert.match(scope, /no automatic upload/i);
  assert.match(hubValue, /manual/i);
  assert.doesNotMatch(lead, /auto-upload promises/i);
  assert.doesNotMatch(scope, /AI/i);

  const plLead = dictionaries.pl.candidateEvidence.lead ?? "";
  assert.match(plLead, /ręcznie/i);
});

test("9 primary limits — candidate ceiling 10 (9 hub cards + CV SoR), evidence green visible", () => {
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.candidate, 10);
  assert.ok(isWorkspaceGreenVisible("candidate", "evidence"));
  assert.ok(!isWorkspaceGreenVisible("candidate", "referrals"));
});

test("10 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE2B_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("11 npm script test:all-workspace-modules-green-wave2b-evidence-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave2b-evidence-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave2b-evidence-guard\.test\.ts/);
});
