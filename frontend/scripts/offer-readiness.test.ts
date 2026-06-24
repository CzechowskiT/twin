/**
 * Offer readiness center — route, copy, and resolver guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE_OFFER_READINESS_ROUTE,
  resolveCandidateOfferReadinessView,
} from "../src/lib/candidate-offer-readiness";
import {
  OFFER_READINESS_EVIDENCE_CROSS_LINKS,
  OFFER_READINESS_EVIDENCE_DOC,
  OFFER_READINESS_EVIDENCE_MARKERS,
  resolveOfferReadinessEvidence,
} from "../src/lib/offer-readiness-evidence";
import {
  OFFER_READINESS_DEMO_CANDIDATE_ID,
  OFFER_READINESS_DEMO_ROLE_ID,
  resolveCandidateOfferReadiness,
} from "../src/lib/offer-readiness";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_COPY = [
  /offer is guaranteed/i,
  /legal approval granted/i,
  /contract ready to sign/i,
  /salary is guaranteed/i,
  /automatic acceptance enabled/i,
  /offer sent/i,
  /payment captured/i,
  /invoice sent/i,
] as const;

const OFFER_ROUTES = [
  "src/app/dashboard/offer-readiness/page.tsx",
  "src/app/profile/offer-readiness/page.tsx",
  "src/app/recruiter/offer-readiness/page.tsx",
  "src/app/company/offer-readiness/page.tsx",
  "src/app/board/offer-readiness/page.tsx",
] as const;

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 evidence doc exists", () => {
  assert.ok(existsSync(join(root, "..", OFFER_READINESS_EVIDENCE_DOC)));
});

test("2 all five persona routes exist", () => {
  for (const route of OFFER_ROUTES) {
    assert.ok(existsSync(join(root, route)), route);
  }
});

test("3 shared evidence panel wired on persona workspaces", () => {
  for (const ws of [
    "src/components/candidate/candidate-offer-readiness-workspace.tsx",
    "src/components/recruiter/recruiter-offer-readiness-preview-workspace.tsx",
    "src/components/board/board-offer-readiness-monitor-workspace.tsx",
  ]) {
    const src = read(ws);
    assert.match(src, /OfferReadinessEvidencePanel/, ws);
    assert.match(src, /offer-readiness-evidence-panel/, ws);
  }
});

test("4 resolver returns demo candidate and role ids", () => {
  const record = resolveCandidateOfferReadiness();
  assert.ok(record);
  assert.equal(record?.candidate_id, OFFER_READINESS_DEMO_CANDIDATE_ID);
  assert.equal(record?.role_id, OFFER_READINESS_DEMO_ROLE_ID);
  assert.equal(record?.checklist.length, 9);
});

test("5 evidence bundle resolves with capabilities", () => {
  const bundle = resolveOfferReadinessEvidence();
  assert.ok(bundle);
  assert.equal(bundle?.smoke_status, "preview_only");
  assert.ok(bundle?.capabilities.some((c) => c.status === "blocked"));
});

test("6 cross-links include trust, placement, calendar", () => {
  const hrefs = OFFER_READINESS_EVIDENCE_CROSS_LINKS.map((l) => l.href);
  assert.ok(hrefs.some((h) => h.includes("trust/overview")));
  assert.ok(hrefs.some((h) => h.includes("placement-verification")));
  assert.ok(hrefs.some((h) => h.includes("calendar/readiness")));
  assert.ok(hrefs.some((h) => h.includes("trust/controls")));
});

test("7 candidate view has human decision boundary marker", () => {
  const src = read("src/components/candidate/candidate-offer-readiness-workspace.tsx");
  assert.match(src, /CANDIDATE_OFFER_READINESS_MARKERS\.boundary/);
  assert.match(src, /boundaryTitle/);
});

test("8 i18n keys present in en and pl", () => {
  assert.ok(en.candidateOfferReadiness.pageTitle);
  assert.ok(dictionaries.pl.candidateOfferReadiness.pageTitle);
  assert.ok(en.offerReadinessEvidence.panelTitle);
  assert.ok(dictionaries.pl.offerReadinessEvidence.panelTitle);
});

test("9 no forbidden offer or payment copy in components", () => {
  const blob =
    read("src/components/shared/offer-readiness-evidence-panel.tsx") +
    read("src/components/shared/offer-comparison-preview.tsx") +
    read("src/components/candidate/candidate-offer-readiness-workspace.tsx") +
    read("src/components/recruiter/recruiter-offer-readiness-preview-workspace.tsx");
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern, `${pattern}`);
  }
});

test("10 package.json exposes browser and verify scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:offer-readiness/);
  assert.match(pkg, /test:offer-readiness-browser/);
  assert.match(pkg, /verify:prod-offer-readiness/);
});

test("11 panel marker constant", () => {
  assert.equal(OFFER_READINESS_EVIDENCE_MARKERS.panel, "offer-readiness-evidence-panel");
});

test("12 candidate route constant", () => {
  assert.equal(CANDIDATE_OFFER_READINESS_ROUTE, "/dashboard/offer-readiness");
  assert.ok(resolveCandidateOfferReadinessView());
});
