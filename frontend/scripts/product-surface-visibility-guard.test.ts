/**
 * Product surface visibility guard — controlled pilot hub defaults (static).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { COMPANY_WORKSPACE_MODULES } from "../src/lib/company-workspace-modules";
import { INVESTOR_ROOM_STATUS } from "../src/lib/investor-room";
import {
  getWorkspacePrimaryLimits,
  splitProductSurfaceRoutes,
  splitWorkspaceModules,
} from "../src/lib/product-surface-visibility";
import { WORKSPACE_GREEN_ONLY_MODE, WORKSPACE_GREEN_PRIMARY_LIMITS } from "../src/lib/all-workspace-green-gate";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import {
  getSystemOfRecordRoutesForPersona,
  SYSTEM_OF_RECORD_ROUTES,
} from "../src/lib/system-of-record-routes";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

const AUDIT_DOC = "docs/PRODUCT_SURFACE_VISIBILITY_AUDIT_2026-07-07.md";

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

test("1 product-surface-visibility module exports hub helpers", () => {
  const src = read("src/lib/product-surface-visibility.ts");
  assert.match(src, /isVisibleInControlledPilot/);
  assert.match(src, /isVisibleInPublicSurface/);
  assert.match(src, /shouldShowAsRoadmap/);
  assert.match(src, /shouldHideFromDefaultHub/);
  assert.match(src, /splitProductSurfaceRoutes/);
});

test("2 auto-apply is paused and hidden from default candidate hub", () => {
  const mod = CANDIDATE_WORKSPACE_MODULES.find((m) => m.id === "auto_apply");
  assert.ok(mod);
  assert.equal(mod!.status, "paused");
  const split = splitWorkspaceModules("candidate", CANDIDATE_WORKSPACE_MODULES);
  assert.ok(split.hidden.some((m) => m.id === "auto_apply"));
  assert.ok(!split.primary.some((m) => m.id === "auto_apply"));
});

test("3 delegated apply is not live in investor reality matrix", () => {
  assert.equal(INVESTOR_ROOM_STATUS.delegatedApply, "notLive");
});

test("4 recruiter calendar is not live and hidden from default hub", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "calendar");
  assert.ok(mod);
  assert.equal(mod!.status, "not_live");
  const sor = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_calendar");
  assert.equal(sor?.status, "not_live");
  const split = splitProductSurfaceRoutes("recruiter", getSystemOfRecordRoutesForPersona("recruiter"));
  assert.ok(split.hidden.some((r) => r.id === "recruiter_calendar"));
});

test("5 billing and ATS import readiness are not live in default hubs", () => {
  const companyBilling = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_billing");
  assert.equal(companyBilling?.status, "not_live");
  const companyAts = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "company_ats_import_readiness");
  assert.ok(companyAts);
  assert.match(companyAts!.boundaryTags.join(","), /no_ats_sync|pilot/);

  const companySplit = splitProductSurfaceRoutes("company", getSystemOfRecordRoutesForPersona("company"));
  assert.ok(companySplit.hidden.some((r) => r.id === "company_billing"));
  assert.ok(companySplit.hidden.some((r) => r.id === "company_ats_import_readiness"));

  const recruiterAts = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "recruiter_ats_import_readiness");
  assert.ok(recruiterAts);
  const recruiterSplit = splitProductSurfaceRoutes("recruiter", getSystemOfRecordRoutesForPersona("recruiter"));
  assert.ok(recruiterSplit.hidden.some((r) => r.id === "recruiter_ats_import_readiness"));
});

test("6 board/admin routes stay out of candidate recruiter company default hubs", () => {
  for (const persona of ["candidate", "recruiter", "company"] as const) {
    const split = splitProductSurfaceRoutes(persona, getSystemOfRecordRoutesForPersona(persona));
    const shown = [...split.primary, ...split.roadmap];
    assert.ok(!shown.some((r) => r.href.startsWith("/board/")), persona);
    assert.ok(!shown.some((r) => r.href.startsWith("/admin/")), persona);
  }
});

test("7 primary hub card counts stay bounded for green-only workspace", () => {
  const limits = getWorkspacePrimaryLimits();
  assert.equal(WORKSPACE_GREEN_ONLY_MODE, true);
  for (const persona of ["candidate", "recruiter", "company"] as const) {
    const split = splitProductSurfaceRoutes(persona, getSystemOfRecordRoutesForPersona(persona));
    const limit = limits[persona];
    assert.ok(split.primary.length <= limit, `${persona}: ${split.primary.length} > ${limit}`);
    assert.ok(split.primary.length >= 2, `${persona} primary too small`);
    assert.equal(split.roadmap.length, 0, `${persona} roadmap must be empty in green mode`);
  }
});

test("8 green-only modules in primary hub UI — no roadmap tier", () => {
  const hub = read("src/components/workspace/system-of-record-navigation-hub.tsx");
  assert.match(hub, /splitProductSurfaceRoutes/);
  assert.match(hub, /data-product-surface-primary/);

  const candidate = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  assert.ok(candidate.primary.every((r) => r.status === "live"));
  assert.equal(candidate.roadmap.length, 0);
});

test("9 recruiter operational work queue hidden from default hub", () => {
  const split = splitProductSurfaceRoutes("recruiter", getSystemOfRecordRoutesForPersona("recruiter"));
  assert.ok(split.hidden.some((r) => r.id === "recruiter_operational_work_queue"));
});

test("10 self-service delete hidden from default candidate hub", () => {
  const split = splitProductSurfaceRoutes("candidate", getSystemOfRecordRoutesForPersona("candidate"));
  assert.ok(split.hidden.some((r) => r.id === "candidate_revoke_delete"));
});

test("11 company workspace billing hidden; talent pool hidden in green mode", () => {
  const split = splitWorkspaceModules("company", COMPANY_WORKSPACE_MODULES);
  assert.ok(split.hidden.some((m) => m.id === "billing"));
  assert.ok(!split.primary.some((m) => m.id === "talent_pool"));
  assert.ok(split.primary.some((m) => m.id === "pipeline"));
  assert.deepEqual(getWorkspacePrimaryLimits().company, WORKSPACE_GREEN_PRIMARY_LIMITS.company);
});

test("12 audit doc states controlled pilot stance — not Launch GO, Gate F PENDING", () => {
  const doc = readRepo(AUDIT_DOC);
  assert.match(doc, /P0 CLOSED/i);
  assert.match(doc, /Gate E PASS/i);
  assert.match(doc, /Gate F PENDING/i);
  assert.match(doc, /Launch NO-GO|NO-GO/i);
  assert.match(doc, /NOT Launch GO/i);
  assert.doesNotMatch(doc, /Gate F[^\n]*\*\*YES\*\*/i);
});

test("13 npm script test:product-surface-visibility-guard registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:product-surface-visibility-guard/);
  assert.match(pkg, /product-surface-visibility-guard\.test\.ts/);
});
