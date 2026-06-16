import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PERSONA_MODULE_ROUTES } from "../src/lib/persona-module-routes";
import { CANDIDATE_WORKSPACE_MODULES } from "../src/lib/candidate-workspace-modules";
import { RECRUITER_WORKSPACE_MODULES } from "../src/lib/recruiter-workspace-modules";
import { loginPathWithNext, lockAuthRedirectDestination } from "../src/lib/login-redirect";
import { resolveEffectiveSessionPersona } from "../src/lib/persona-access";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 workspace module cards use Next Link href (no router.push)", () => {
  const card = read("src/components/workspace/workspace-module-card.tsx");
  assert.match(card, /import Link from "next\/link"/);
  assert.match(card, /<Link[\s\S]*href=\{href\}/);
  assert.doesNotMatch(card, /router\.push/);
  assert.doesNotMatch(card, /onClick=\{[^}]*preventDefault/);
});

test("2 modifier keys are not blocked on hash anchors", () => {
  const anchor = read("src/lib/dashboard-anchor.ts");
  assert.match(anchor, /e\.metaKey \|\| e\.ctrlKey/);
  assert.match(read("src/components/workspace/workspace-module-card.tsx"), /scrollToDashboardHash/);
});

test("3 PERSONA_MODULE_ROUTES central map covers all module defs", () => {
  assert.ok(PERSONA_MODULE_ROUTES.candidate.length >= CANDIDATE_WORKSPACE_MODULES.length);
  assert.ok(PERSONA_MODULE_ROUTES.recruiter.length >= RECRUITER_WORKSPACE_MODULES.length);
  assert.ok(
    PERSONA_MODULE_ROUTES.recruiter.some((href) => href.startsWith("/recruiter/pipeline")),
  );
});

test("4 PersonaWorkspaceGate preserves next through login redirect", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  assert.match(gate, /lockAuthRedirectDestination/);
  assert.match(gate, /loginPathWithNext/);
  assert.doesNotMatch(gate, /router\.replace\(loginWithNext\)/);
  assert.match(gate, /href=\{loginWithNext\}/);
  const locked = { current: null as string | null };
  lockAuthRedirectDestination(locked, "/recruiter/pipeline", "/login/recruiter", null);
  assert.equal(locked.current, "/recruiter/pipeline");
  lockAuthRedirectDestination(locked, "/login/recruiter", "/login/recruiter", null);
  assert.equal(locked.current, "/recruiter/pipeline");
  assert.equal(
    loginPathWithNext("/login/recruiter", locked.current!),
    "/login/recruiter?next=%2Frecruiter%2Fpipeline",
  );
});

test("5 path-locked persona wins over transient provider state", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  assert.match(gate, /resolveEffectiveSessionPersona/);
  const resolved = resolveEffectiveSessionPersona("/recruiter/pipeline", "candidate");
  assert.equal(resolved, "recruiter");
});

test("6 authenticated deep links are not replaced with generic hub", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  assert.match(gate, /isPathAllowedForPersona\(pathname, effectivePersona\)/);
  const access = read("src/lib/persona-access.ts");
  assert.match(access, /isPersonaModuleDeepLink/);
});

test("7 login zone form honors next query param", () => {
  const login = read("src/components/auth/login-zone-form.tsx");
  assert.match(login, /searchParams\.get\("next"\)/);
  assert.match(login, /router\.push\(nextPath\)/);
  assert.equal(
    loginPathWithNext("/login/recruiter", "/recruiter/talent-radar"),
    "/login/recruiter?next=%2Frecruiter%2Ftalent-radar",
  );
});

test("8 candidate module nav renders link grid", () => {
  const nav = read("src/components/dashboard/candidate-module-nav.tsx");
  assert.match(nav, /WorkspaceModuleGrid/);
  assert.match(nav, /CANDIDATE_WORKSPACE_MODULES/);
  assert.doesNotMatch(nav, /router\.push/);
});

test("9 LightweightRouteShell never blocks hidden tabs", () => {
  const shell = read("src/components/lightweight-route-shell.tsx");
  assert.match(shell, /if \(hidden\) \{\s*setPaintReady\(true\)/);
  assert.match(shell, /lightweight-route-shell-ready/);
});

test("10 workspace layouts wire gate + lightweight shell", () => {
  const layout = read("src/components/workspace-route-layout.tsx");
  assert.match(layout, /PersonaWorkspaceGate/);
  assert.match(layout, /LightweightRouteShell/);
  assert.match(read("src/app/recruiter/recruiter-layout-client.tsx"), /WorkspaceRouteLayout/);
  assert.match(read("src/app/company/layout.tsx"), /WorkspaceRouteLayout/);
});
