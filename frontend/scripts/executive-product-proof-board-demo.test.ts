/**
 * Executive Product Proof / Board Demo — routes, markers, and hard-ban guards (17 assertions).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS,
  EXECUTIVE_PRODUCT_PROOF_MARKERS,
  EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER,
  EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE,
  EXECUTIVE_PRODUCT_PROOF_WORKSPACE_ROUTE,
  EXECUTIVE_PRODUCT_PROOF_FORBIDDEN_PATTERNS,
  LAUNCH_STANCE,
} from "../src/lib/executive-product-proof";
import { SYSTEM_OF_RECORD_ROUTES } from "../src/lib/system-of-record-routes";
import { en, LOCALES, dictionaries } from "../src/lib/i18n";

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

test("1 public and workspace product-proof routes exist", () => {
  assert.ok(existsSync(join(root, "src/app/investor/product-proof/page.tsx")));
  assert.ok(existsSync(join(root, "src/app/workspace/investor/product-proof/page.tsx")));
  assert.equal(EXECUTIVE_PRODUCT_PROOF_PUBLIC_ROUTE, "/investor/product-proof");
  assert.equal(EXECUTIVE_PRODUCT_PROOF_WORKSPACE_ROUTE, "/workspace/investor/product-proof");
});

test("2 board component renders all ten section markers", () => {
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  assert.match(board, new RegExp(EXECUTIVE_PRODUCT_PROOF_PAGE_MARKER));
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.header/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.sorStack/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.maturityMatrix/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.deliveryHistory/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.launchStatus/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.demoLinks/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.humanDecisioning/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.boundaryProof/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.riskRegister/);
  assert.match(board, /EXECUTIVE_PRODUCT_PROOF_MARKERS\.milestones/);
});

test("3 launch stance remains NO-GO", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  assert.match(en.executiveProductProof.launchNoGo, /NO-GO/);
});

test("4 demo links include all required SOR modules", () => {
  const ids = EXECUTIVE_PRODUCT_PROOF_DEMO_LINKS.map((l) => l.id) as string[];
  for (const required of [
    "demo",
    "profile360",
    "pipeline",
    "notes",
    "trust",
    "team",
    "communication",
    "ats",
    "decision_memory",
  ]) {
    assert.ok(ids.includes(required), required);
  }
});

test("5 investor room demo map links to product proof", () => {
  const room = read("src/lib/investor-room.ts");
  assert.match(room, /productProof/);
  assert.match(room, /\/investor\/product-proof/);
});

test("6 system-of-record hub registers investor product proof with boundaries", () => {
  const entry = SYSTEM_OF_RECORD_ROUTES.find((r) => r.id === "investor_product_proof");
  assert.ok(entry);
  assert.equal(entry?.href, "/investor/product-proof");
  assert.equal(entry?.status, "live");
  assert.equal(entry?.investorGroup, "investorProduct");
  assert.ok(entry?.hintKey);
  assert.ok(entry?.boundaryTags.includes("human_decision_required"));
  assert.ok(entry?.boundaryTags.includes("no_outreach"));
  assert.ok(entry?.boundaryTags.includes("no_ats_sync"));
  for (const locale of LOCALES) {
    const hint = dictionaries[locale].executiveProductProof.sorHubHint;
    assert.ok(typeof hint === "string" && hint.length > 0, locale);
    assert.doesNotMatch(hint, /launch ready/i, locale);
  }
});

test("7 demo data has no email patterns", () => {
  const demo = read("src/lib/executive-product-proof-demo-data.ts");
  assert.doesNotMatch(demo, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("8 forbidden patterns not in component source", () => {
  const board = read("src/components/investor/executive-product-proof-board.tsx");
  for (const pattern of EXECUTIVE_PRODUCT_PROOF_FORBIDDEN_PATTERNS) {
    assert.doesNotMatch(board, pattern, String(pattern));
  }
});

test("9 i18n keys exist for all locales", () => {
  for (const locale of LOCALES) {
    const section = dictionaries[locale].executiveProductProof;
    assert.ok(section?.title, locale);
    assert.ok(section?.launchNoGo, locale);
    assert.ok(section?.humanBody, locale);
  }
});

test("10 workspace route uses PersonaWorkspaceGate not layout edits", () => {
  const page = read("src/app/workspace/investor/product-proof/page.tsx");
  assert.match(page, /PersonaWorkspaceGate/);
  assert.match(page, /ExecutiveProductProofBoard/);
});

test("11 public route does not require workspace gate", () => {
  const page = read("src/app/investor/product-proof/page.tsx");
  assert.doesNotMatch(page, /PersonaWorkspaceGate/);
  assert.match(page, /ExecutiveProductProofBoard/);
});

test("12 shell/gate/layout files not modified by feature blob", () => {
  const paths = [
    "src/lib/executive-product-proof.ts",
    "src/lib/executive-product-proof-demo-data.ts",
    "src/components/investor/executive-product-proof-board.tsx",
    "src/app/investor/product-proof/page.tsx",
  ];
  const blob = paths.map((p) => read(p)).join("\n");
  for (const forbidden of FORBIDDEN_SHELL_FILES) {
    assert.doesNotMatch(blob, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
});

test("13 docs file exists", () => {
  assert.ok(existsSync(join(root, "..", "docs/EXECUTIVE_PRODUCT_PROOF_BOARD_DEMO_2026-06-17.md")));
});

test("14 package.json exposes test scripts", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:executive-product-proof-board-demo/);
  assert.match(pkg, /test:executive-product-proof-board-demo-browser/);
});

test("15 P0 performance called OPEN not DONE", () => {
  const demo = read("src/lib/executive-product-proof-demo-data.ts");
  assert.match(demo, /OPEN/);
  assert.doesNotMatch(demo, /P0.*DONE/i);
});

test("16 Phase 3B referenced as blocked not shipped", () => {
  const demo = read("src/lib/executive-product-proof-demo-data.ts");
  assert.match(demo, /Phase 3B.*blocked/i);
});

test("17 PL executive product proof eyebrow localized vs EN", () => {
  const pl = dictionaries.pl.executiveProductProof;
  assert.notEqual(pl.pageEyebrow, en.executiveProductProof.pageEyebrow);
  assert.doesNotMatch(pl.pageEyebrow, /^Executive product proof$/);
  assert.match(pl.sorHubHint.toLowerCase(), /dowód|due diligence|kontakt|ats/);
});

test("18 investor room demo map label key resolves in all locales", () => {
  for (const locale of LOCALES) {
    const label = dictionaries[locale].investorRoom.demoMapProductProof;
    assert.ok(label.length > 0, locale);
    assert.doesNotMatch(label, /launch ready/i, locale);
  }
});
