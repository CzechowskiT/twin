/**
 * Session persona workspace switcher — header badge + storage helper.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("PersonaBadge is an authenticated space switcher dropdown", () => {
  const badge = read("src/components/persona-badge.tsx");
  assert.match(badge, /switchSessionPersonaWorkspace/);
  assert.match(badge, /MARKETING_PERSONAS\.map/);
  assert.match(badge, /nav\.switchPersona/);
  assert.match(badge, /twin-persona-badge/);
  assert.doesNotMatch(badge, /logoutToSwitchRole/);
});

test("workspace header keeps PersonaBadge for session chrome", () => {
  const header = read("src/components/workspace-site-header-bar.tsx");
  assert.match(header, /PersonaBadge/);
  assert.match(header, /hasSession \? <PersonaBadge/);
});

test("switchSessionPersonaWorkspace persists lane and assigns workspace home", () => {
  const lib = read("src/lib/session-persona.ts");
  assert.match(lib, /export function switchSessionPersonaWorkspace/);
  assert.match(lib, /setSessionPersona\(persona\)/);
  assert.match(lib, /window\.location\.assign\(WORKSPACE_PATH\[persona\]\)/);
});

test("i18n exposes switchPersona in EN and PL", () => {
  const i18n = read("src/lib/i18n.ts");
  assert.match(i18n, /switchPersona: "Switch space"/);
  assert.match(i18n, /switchPersona: "Przełącz przestrzeń"/);
});

test("persona-auth WORKSPACE_PATH covers all marketing personas", async () => {
  const { WORKSPACE_PATH } = await import("../src/lib/persona-auth");
  assert.equal(WORKSPACE_PATH.candidate, "/workspace/candidate");
  assert.equal(WORKSPACE_PATH.recruiter, "/workspace/recruiter");
  assert.equal(WORKSPACE_PATH.company, "/company/dashboard");
  assert.equal(WORKSPACE_PATH.investor, "/workspace/investor");
});
