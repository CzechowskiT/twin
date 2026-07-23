/**
 * Guard: company Wave3 Hard LIVE PASS modules must have real page.tsx routes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_PAGES = [
  "org-settings",
  "permissions",
  "audit-log",
  "scorecards",
  "notifications",
  "onboarding",
  "trust-summary",
];

test("company Wave3 PASS modules have page.tsx", () => {
  for (const seg of REQUIRED_PAGES) {
    const p = path.join(root, "src/app/company", seg, "page.tsx");
    assert.ok(fs.existsSync(p), `missing ${p}`);
    const src = fs.readFileSync(p, "utf8");
    assert.match(src, /CompanyWave3ModuleClient/);
  }
});

test("company Wave3 BFF proxy allowlist covers registry routes", () => {
  const route = path.join(root, "src/app/api/company/wave3/[...path]/route.ts");
  const src = fs.readFileSync(route, "utf8");
  for (const seg of [
    "org-settings",
    "permissions",
    "audit-log",
    "scorecards",
    "notifications/draft",
    "onboarding",
    "trust-summary",
  ]) {
    assert.match(src, new RegExp(seg.replace("/", "\\/")));
  }
});
