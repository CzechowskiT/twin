/**
 * Scheduling proposal pack — route wiring, copy guards, cross-links.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SCHEDULING_PROPOSAL_DOC,
  SCHEDULING_PROPOSAL_MARKERS,
  SCHEDULING_PROPOSAL_PERSONAS,
  SCHEDULING_PROPOSAL_ROUTES,
  resolveSchedulingProposal,
  schedulingProposalCrossLinks,
} from "../src/lib/scheduling-proposal";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROUTE_FILES = [
  "src/app/dashboard/scheduling-proposal/page.tsx",
  "src/app/profile/scheduling-proposal/page.tsx",
  "src/app/recruiter/scheduling-proposal/page.tsx",
  "src/app/company/scheduling-proposal/page.tsx",
  "src/app/board/scheduling-proposal/page.tsx",
] as const;

const REQUIRED_BLOCKED = [
  /no event write/i,
  /no invite sent/i,
  /no email sent/i,
  /no calendar sync/i,
  /no ats writeback/i,
] as const;

const FORBIDDEN_COPY = [
  /meeting created/i,
  /(?<!no )invite sent/i,
  /(?<!no )email sent/i,
  /calendar synced/i,
  /automatic scheduling/i,
  /employer confirmed/i,
  /offer accepted/i,
  /revenue recognized/i,
  /launch ready/i,
] as const;

const SECRET_PATTERNS = [/sk_live_/i, /Bearer eyJ/i, /password\s*=\s*["'][^"']+["']/i] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 domain data contains four persona variants", () => {
  assert.equal(SCHEDULING_PROPOSAL_PERSONAS.length, 4);
  for (const persona of SCHEDULING_PROPOSAL_PERSONAS) {
    const proposal = resolveSchedulingProposal(persona);
    assert.equal(proposal.persona, persona);
    assert.ok(proposal.readinessSignals.length >= 5);
    assert.ok(proposal.blockedActions.length >= 6);
    assert.ok(proposal.humanReviewChecklist.length >= 4);
    assert.ok(proposal.auditTrail.length >= 5);
  }
});

test("2 all five routes are registered", () => {
  for (const route of ROUTE_FILES) {
    assert.ok(existsSync(join(root, route)), route);
    const src = read(route);
    assert.match(src, /SchedulingProposalPanel/);
  }
  assert.equal(SCHEDULING_PROPOSAL_ROUTES.candidate, "/dashboard/scheduling-proposal");
  assert.equal(SCHEDULING_PROPOSAL_ROUTES.profile, "/profile/scheduling-proposal");
  assert.equal(SCHEDULING_PROPOSAL_ROUTES.recruiter, "/recruiter/scheduling-proposal");
  assert.equal(SCHEDULING_PROPOSAL_ROUTES.company, "/company/scheduling-proposal");
  assert.equal(SCHEDULING_PROPOSAL_ROUTES.board, "/board/scheduling-proposal");
});

test("3 panel shows read-only preview badge", () => {
  const panel = read("src/components/scheduling-proposal/SchedulingProposalPanel.tsx");
  assert.match(panel, /SCHEDULING_PROPOSAL_MARKERS\.readOnlyBadge/);
  assert.match(panel, /schedulingProposal\.readOnlyBadge/);
});

test("4 blocked actions include required boundaries", () => {
  const blob = JSON.stringify(en.schedulingProposal);
  for (const pattern of REQUIRED_BLOCKED) {
    assert.match(blob, pattern, `required in EN: ${pattern}`);
  }
  const proposal = resolveSchedulingProposal("candidate");
  const ids = proposal.blockedActions.map((a) => a.id);
  assert.ok(ids.includes("event_write"));
  assert.ok(ids.includes("invite_sent"));
  assert.ok(ids.includes("email_sent"));
  assert.ok(ids.includes("calendar_sync"));
  assert.ok(ids.includes("ats_writeback"));
});

test("5 human review checklist visible in panel", () => {
  const panel = read("src/components/scheduling-proposal/SchedulingProposalPanel.tsx");
  assert.match(panel, /SCHEDULING_PROPOSAL_MARKERS\.humanReview/);
  assert.match(panel, /humanReviewChecklist/);
});

test("6 evidence audit trail visible in panel", () => {
  const panel = read("src/components/scheduling-proposal/SchedulingProposalPanel.tsx");
  assert.match(panel, /SCHEDULING_PROPOSAL_MARKERS\.auditTrail/);
  assert.match(panel, /auditTrail/);
});

test("7 cross-links point to existing safe routes", () => {
  const links = schedulingProposalCrossLinks("candidate");
  const hrefs = links.map((l) => l.href);
  assert.ok(hrefs.includes("/dashboard/offer-readiness"));
  assert.ok(hrefs.includes("/dashboard/placement-verification"));
  assert.ok(hrefs.includes("/dashboard/calendar/readiness"));
  assert.ok(hrefs.includes("/board/scheduling-proposal"));
});

test("8 no forbidden claims in EN i18n namespace", () => {
  const blob = JSON.stringify(en.schedulingProposal);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `forbidden in EN: ${pattern}`);
  }
});

test("9 i18n keys exist for EN and PL", () => {
  const enKeys = Object.keys(en.schedulingProposal);
  const plKeys = Object.keys(dictionaries.pl.schedulingProposal);
  assert.deepEqual(plKeys.sort(), enKeys.sort());
  assert.ok(en.schedulingProposal.pageTitle);
  assert.ok(dictionaries.pl.schedulingProposal.pageTitle);
});

test("10 no token or secret-like strings in scheduling proposal sources", () => {
  const combined =
    read("src/lib/scheduling-proposal.ts") +
    read("src/lib/scheduling-proposal-demo-data.ts") +
    read("src/components/scheduling-proposal/SchedulingProposalPanel.tsx");
  for (const pattern of SECRET_PATTERNS) {
    assert.doesNotMatch(combined, pattern, `secret pattern: ${pattern}`);
  }
});

test("11 doc file exists and npm script registered", () => {
  assert.ok(existsSync(join(root, "..", SCHEDULING_PROPOSAL_DOC)));
  assert.match(read("package.json"), /test:scheduling-proposal/);
});

test("12 panel markers wired", () => {
  const panel = read("src/components/scheduling-proposal/SchedulingProposalPanel.tsx");
  assert.match(panel, new RegExp(SCHEDULING_PROPOSAL_MARKERS.page));
  assert.match(panel, /SCHEDULING_PROPOSAL_MARKERS\.blockedActions/);
  assert.match(panel, /SCHEDULING_PROPOSAL_MARKERS\.readinessSignals/);
});
