import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RECRUITER_TALENT_POOL_FORBIDDEN_PII,
  RECRUITER_TALENT_POOL_IMPORT_ROUTE,
  RECRUITER_TALENT_POOL_MARKERS,
  RECRUITER_TALENT_POOL_ROUTE,
  TALENT_POOL_CSV_TEMPLATE,
  talentPoolRowHasForbiddenPii,
} from "../src/lib/recruiter-talent-pool";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { TALENT_RADAR_SEGMENTS, TALENT_RADAR_SIGNALS } from "../src/lib/recruiter-talent-radar";
import { dictionaries, en, LOCALES } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const FORBIDDEN_COPY = [
  /\blinkedin\b/i,
  /\bautomatically contact\b/i,
  /\bauto.*outreach enabled\b/i,
];

test("1 talent pool route exists", () => {
  assert.equal(RECRUITER_TALENT_POOL_ROUTE, "/recruiter/talent-pool");
  assert.match(readSrc("src/app/recruiter/talent-pool/page.tsx"), /RecruiterTalentPoolClient/);
  assert.match(readSrc("src/app/api/recruiter/talent-pool/route.ts"), /talent-pool/);
});

test("2 import route and BFF exist", () => {
  assert.equal(RECRUITER_TALENT_POOL_IMPORT_ROUTE, "/recruiter/talent-pool/import");
  assert.match(readSrc("src/app/recruiter/talent-pool/import/page.tsx"), /RecruiterTalentPoolImportClient/);
  assert.match(readSrc("src/app/api/recruiter/talent-pool/import/preview/route.ts"), /preview/);
  assert.match(readSrc("src/app/api/recruiter/talent-pool/import/commit/route.ts"), /commit/);
});

test("3 recruiter hub links to talent pool", () => {
  const mod = RECRUITER_WORKSPACE_MODULES.find((m) => m.id === "talent_pool");
  assert.ok(mod);
  assert.equal(mod?.href, "/recruiter/talent-pool");
  assert.equal(mod?.status, "pilot");
});

test("4 main page markers and summary panels", () => {
  const client = readSrc("src/app/recruiter/talent-pool/recruiter-talent-pool-client.tsx");
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.summaryPanel/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.qualityPanel/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.sourceCoverage/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.emptyState/);
});

test("5 import page csv paste and preview/commit flow", () => {
  const client = readSrc("src/app/recruiter/talent-pool/import/recruiter-talent-pool-import-client.tsx");
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.csvPaste/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.previewPanel/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.commitButton/);
  assert.match(client, /RECRUITER_TALENT_POOL_MARKERS\.resultPanel/);
  assert.match(TALENT_POOL_CSV_TEMPLATE, /display_name/);
});

test("6 no forbidden PII in sample row guard", () => {
  assert.equal(talentPoolRowHasForbiddenPii({ display_name: "Alex" }), false);
  for (const marker of RECRUITER_TALENT_POOL_FORBIDDEN_PII) {
    assert.equal(talentPoolRowHasForbiddenPii({ note: `leak ${marker}` }), true);
  }
});

test("7 empty state mentions no external sourcing", () => {
  assert.match(en.recruiterTalentPool.emptyBody.toLowerCase(), /no external sourcing/);
  assert.match(en.recruiterTalentPoolImport.csvHint.toLowerCase(), /no email/);
});

test("8 trust copy and no live sync claims", () => {
  const blob = JSON.stringify(en.recruiterTalentPool) + JSON.stringify(en.recruiterTalentPoolImport);
  for (const pattern of FORBIDDEN_COPY) {
    assert.doesNotMatch(blob, pattern);
  }
  assert.match(en.recruiterTalentPool.chipNoLiveSync.toLowerCase(), /no live ats sync/);
  assert.match(en.recruiterTalentPool.lead.toLowerCase(), /no external sourcing/);
});

test("9 talent radar integration segment and signal", () => {
  assert.ok(TALENT_RADAR_SEGMENTS.includes("imported_internal_pool"));
  assert.ok(TALENT_RADAR_SIGNALS.includes("imported_internal_pool"));
  assert.match(readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-card.tsx"), /chipTalentPoolSource/);
});

test("10 cross-links from radar and search", () => {
  assert.match(readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx"), /\/recruiter\/talent-pool/);
  assert.match(readSrc("src/app/recruiter/search/recruiter-search-client.tsx"), /\/recruiter\/talent-pool/);
});

test("11 integrations readiness includes talent pool import", () => {
  const integrations = readSrc("src/lib/recruiter-integrations-readiness.ts");
  assert.match(integrations, /talent_pool_import/);
  assert.match(integrations, /\/recruiter\/talent-pool/);
});

test("12 design doc referenced", () => {
  const doc = readFileSync(join(root, "..", "docs", "RECRUITER_TALENT_POOL_IMPORT_MVP_2026-06-15.md"), "utf8");
  assert.match(doc, /CSV paste/);
  assert.match(doc, /NO-GO/i);
});

test("13-14 i18n keys present for all locales", () => {
  for (const locale of LOCALES) {
    const pool = dictionaries[locale].recruiterTalentPool;
    const imp = dictionaries[locale].recruiterTalentPoolImport;
    assert.ok(pool.title.length > 0, `pool title ${locale}`);
    assert.ok(imp.title.length > 0, `import title ${locale}`);
  }
});

test("15 launch stance unchanged in matrices", () => {
  const prodMatrix = readFileSync(join(root, "..", "docs", "PRODUCTION_REALITY_MATRIX_2026-05-27.md"), "utf8");
  const launchMatrix = readFileSync(join(root, "..", "docs", "PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md"), "utf8");
  assert.match(prodMatrix, /NO-GO/i);
  assert.match(launchMatrix, /NO-GO/i);
  assert.match(prodMatrix, /RECRUITER_TALENT_POOL_IMPORT_MVP_2026-06-15/);
});

test("16 backend service and migration exist", () => {
  assert.match(readFileSync(join(root, "..", "backend/app/services/recruiter_talent_pool_import.py"), "utf8"), /preview_talent_pool_import/);
  assert.match(readFileSync(join(root, "..", "backend/alembic/versions/059_recruiter_talent_pool_import.py"), "utf8"), /recruiter_talent_pool_records/);
});
