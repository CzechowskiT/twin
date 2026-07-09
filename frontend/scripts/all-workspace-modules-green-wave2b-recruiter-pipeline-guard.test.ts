/**
 * Wave 2B Slice 2 — recruiter pipeline MAKE_GREEN static guard (2026-07-09).
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
  WAVE2B_PIPELINE_ALWAYS_IN_HUB,
  WAVE2B_SLICE2_MAKE_GREEN_MODULE_ID,
  WAVE2B_SLICE2_MAKE_GREEN_SOR_IDS,
  WORKSPACE_GREEN_ONLY_MODE,
  WORKSPACE_GREEN_PRIMARY_LIMITS,
} from "../src/lib/all-workspace-green-gate";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import {
  classifyProductSurfaceTier,
  shouldHideFromDefaultHub,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import {
  RECRUITER_PIPELINE_SHIP_STATUS,
  RECRUITER_PRIMARY_NAV_HREFS,
} from "../src/lib/seven-day-d3-recruiter";
import { CANONICAL_STANCE, NOT_READY_FOR_LAUNCH } from "../src/lib/seven-day-d7-final-qa";
import { dictionaries, en } from "../src/lib/i18n";
import { getSystemOfRecordRoutesForPersona } from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const WAVE2B_PIPELINE_DOC = "docs/ALL_WORKSPACE_MODULES_GREEN_WAVE2B_RECRUITER_PIPELINE_2026-07-09.md";
const DEMO_LOGIN_DOC = "docs/DEMO_LOGIN_FOR_FOUNDER.md";

const NON_GREEN_BADGES = ["pilot", "preview", "coming_soon", "paused", "not_live", "needs_setup"] as const;

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 wave2b recruiter pipeline doc exists with stance and selected module", () => {
  const doc = readRepo(WAVE2B_PIPELINE_DOC);
  assert.match(doc, /Wave 2B/i);
  assert.match(doc, /WAVE2B_SLICE2_MAKE_GREEN_MODULE: pipeline/);
  assert.match(doc, /WAVE2B_SLICE2_BACK_IN_HUB: true/);
  assert.match(doc, /WAVE2B_SLICE2_M7_SMOKE: NEEDS_FOUNDER_AUTH_SMOKE/);
  assert.match(doc, /Launch NO-GO/);
  assert.match(doc, /NOT_GATE_F_YES: true/);
  assert.match(doc, /NOT_PHASE_3B: true/);
});

test("2 wave2b slice2 gate exports — pipeline green, hidden count unchanged", () => {
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  assert.equal(WAVE2B_SLICE2_MAKE_GREEN_MODULE_ID, "pipeline");
  assert.deepEqual(WAVE2B_SLICE2_MAKE_GREEN_SOR_IDS, ["pipeline", "recruiter_pipeline"]);
  assert.equal(WAVE2B_PIPELINE_ALWAYS_IN_HUB, true);
  assert.equal(WAVE1_HIDDEN_WORKSPACE_CARD_COUNT, 20);
  assert.equal(WAVE2A_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.equal(WAVE2B_EFFECTIVE_HIDDEN_WORKSPACE_CARD_COUNT, 19);
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("pipeline"));
  assert.ok(GREEN_WORKSPACE_ALLOWED_IDS.recruiter.includes("recruiter_pipeline"));
});

test("3 seven-day-d3 — pipeline live, visible in hub and primary nav", () => {
  assert.equal(RECRUITER_PIPELINE_SHIP_STATUS, "live");
  assert.equal(shouldHideFromDefaultHub("recruiter", "pipeline"), false);
  assert.equal(classifyProductSurfaceTier("recruiter", "pipeline"), "LIVE");
  assert.ok((RECRUITER_PRIMARY_NAV_HREFS as readonly string[]).includes("/recruiter/pipeline"));
});

test("4 recruiter workspace — pipeline primary live, non-green hidden", () => {
  const split = splitWorkspaceModules("recruiter", RECRUITER_WORKSPACE_MODULES);
  const pipeline = split.primary.find((m) => m.id === "pipeline");
  assert.ok(pipeline);
  assert.equal(pipeline?.status, "live");
  assert.equal(split.primary.filter((m) => m.status === "live").length, 5);
  assert.equal(split.roadmap.length, 0);
  assert.ok(!split.primary.some((m) => NON_GREEN_BADGES.includes(m.status as (typeof NON_GREEN_BADGES)[number])));
  assert.ok(split.hidden.some((m) => m.id === "talent_pool"));
  assert.ok(split.hidden.some((m) => m.id === "integrations"));
});

test("5 pipeline page — token gate, API proxy, human decision UX", () => {
  const client = read("src/app/recruiter/pipeline/recruiter-pipeline-client.tsx");
  assert.match(client, /RECRUITER_PIPELINE_SHIP_STATUS/);
  assert.match(client, /data-wave2b-recruiter-pipeline-green/);
  assert.match(client, /RecruiterAccessFields/);
  assert.match(client, /\/api\/recruiter\/pipeline/);
  assert.match(client, /openInInbox/);
  assert.match(client, /recruiterPipelineNextActionKey/);
  assert.match(client, /boundaryNote/);
  assert.doesNotMatch(client, /auto outreach/i);
  assert.doesNotMatch(client, /live ATS/i);
});

test("6 SoR pipeline route — live, human decision, no ATS sync", () => {
  const routes = getSystemOfRecordRoutesForPersona("recruiter");
  const pipeline = routes.find((r) => r.id === "recruiter_pipeline");
  assert.ok(pipeline);
  assert.equal(pipeline?.status, "live");
  assert.equal(pipeline?.href, "/recruiter/pipeline");
  assert.ok(pipeline?.boundaryTags.includes("human_decision_required"));
  assert.ok(pipeline?.boundaryTags.includes("no_ats_sync"));
});

test("7 honest copy — human decision, no ATS or auto outreach in strings", () => {
  const hubValue = en.workspaceModules.recruiterPipelineValue ?? "";
  const lead = en.recruiterPipeline.lead ?? "";
  const boundary = en.recruiterPipeline.boundaryNote ?? "";
  assert.match(hubValue, /human decision/i);
  assert.match(hubValue, /no live ATS/i);
  assert.match(hubValue, /no auto outreach/i);
  assert.match(lead, /No external email/i);
  assert.match(boundary, /explicit recruiter action/i);
  assert.match(boundary, /No live ATS/i);
  assert.match(boundary, /no automated outreach|No live ATS import or automated outreach/i);

  const plValue = dictionaries.pl.workspaceModules.recruiterPipelineValue ?? "";
  assert.match(plValue, /Decyzja człowieka/i);
});

test("8 M7 smoke honesty — no recruiter token in founder demo doc", () => {
  const demoDoc = readRepo(DEMO_LOGIN_DOC);
  assert.match(demoDoc, /demo@twin\.career/);
  assert.doesNotMatch(demoDoc, /recruiter.*token/i);
  const waveDoc = readRepo(WAVE2B_PIPELINE_DOC);
  assert.match(waveDoc, /NEEDS_FOUNDER_AUTH_SMOKE/);
});

test("9 primary limits — recruiter ceiling 5, pipeline green visible", () => {
  assert.equal(WORKSPACE_GREEN_PRIMARY_LIMITS.recruiter, 5);
  assert.ok(isWorkspaceGreenVisible("recruiter", "pipeline"));
  assert.ok(!isWorkspaceGreenVisible("recruiter", "talent_pool"));

  const hub = read("src/app/recruiter/page.tsx");
  assert.match(hub, /\/recruiter\/pipeline/);
  assert.match(hub, /recruiterPipelineCta/);
});

test("10 canonical stance preserved — NOT Launch GO", () => {
  assert.equal(CANONICAL_STANCE, "P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO");
  assert.equal(NOT_READY_FOR_LAUNCH, true);
  const doc = readRepo(WAVE2B_PIPELINE_DOC);
  assert.doesNotMatch(doc, /Launch:\s*\*\*GO\*\*/);
  assert.doesNotMatch(doc, /Gate F:\s*\*\*YES\*\*/);
});

test("11 npm script test:all-workspace-modules-green-wave2b-recruiter-pipeline-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /"test:all-workspace-modules-green-wave2b-recruiter-pipeline-guard":/);
  assert.match(pkg, /all-workspace-modules-green-wave2b-recruiter-pipeline-guard\.test\.ts/);
});
