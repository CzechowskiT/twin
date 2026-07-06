/**
 * Gate E attempt 17 — static guard for React #418 / page-error:1 on /recruiter/*.
 * Prod diagnostics: Minified React error #418 (hydration mismatch on <html> tree).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const HYDRATION_SOURCES = [
  "src/hooks/use-page-visibility.ts",
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-provider.tsx",
  "src/components/page-momentum-rail.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/language-provider.tsx",
] as const;

test("1 visibility + route shell avoid document.* during useState init", () => {
  const visibility = read("src/hooks/use-page-visibility.ts");
  assert.doesNotMatch(visibility, /useState\(\(\)\s*=>\s*[\s\S]*document/);
  assert.match(visibility, /React #418|Match server first paint/);

  const shell = read("src/components/lightweight-route-shell.tsx");
  assert.doesNotMatch(shell, /useState\(\(\)\s*=>\s*[\s\S]*document/);
  assert.match(shell, /useState\(false\)/);
});

test("2 persona + momentum rail defer browser session reads until after mount", () => {
  const persona = read("src/components/persona-provider.tsx");
  assert.match(persona, /useState<MarketingPersona>\("candidate"\)/);
  assert.doesNotMatch(persona, /useState<MarketingPersona>\(\(\)\s*=>\s*[\s\S]*getToken/);

  const rail = read("src/components/page-momentum-rail.tsx");
  assert.match(rail, /useState\(false\)/);
  assert.match(rail, /setHasSession\(Boolean\(getToken\(\)\)\)/);
  assert.doesNotMatch(rail, /const hasSession = Boolean\(getToken\(\)\)/);
});

test("3 PersonaWorkspaceGate uses deferred session state + skeleton fallback", () => {
  const gate = read("src/components/persona-workspace-gate.tsx");
  assert.match(gate, /useState<boolean \| null>\(null\)/);
  assert.match(gate, /setHasSession\(hasActiveSession\(\)\)/);
  assert.match(gate, /hasSession === null/);
  assert.match(gate, /WorkspaceRouteSkeleton/);
  assert.doesNotMatch(gate, /const hasSession = hasActiveSession\(\)/);
});

test("4 no global page-error masking in app shell", () => {
  const providers = read("src/components/providers.tsx");
  const layout = read("src/app/layout.tsx");
  const blob = `${providers}\n${layout}\n${HYDRATION_SOURCES.map((p) => read(p)).join("\n")}`;
  assert.doesNotMatch(blob, /suppressHydrationWarning[\s\S]{0,80}body/);
  assert.doesNotMatch(blob, /onError=\{/);
  assert.doesNotMatch(blob, /componentDidCatch/);
  assert.doesNotMatch(blob, /ErrorBoundary/);
});

test("5 /recruiter route + shared recruiter workspaces remain registered", () => {
  const recruiterPage = read("src/app/recruiter/page.tsx");
  assert.match(recruiterPage, /export default function RecruiterHubPage/);
  assert.match(recruiterPage, /SystemOfRecordNavigationHub/);

  const layout = read("src/app/recruiter/layout.tsx");
  assert.match(layout, /RecruiterLayoutClient/);

  const profile360 = read("src/components/recruiter/candidate-profile-360-workspace.tsx");
  assert.match(profile360, /export function CandidateProfile360Workspace/);

  const trust = read("src/components/recruiter/candidate-trust-workspace.tsx");
  assert.match(trust, /export function CandidateTrustWorkspace/);
});

test("6 scope lock — frontend-only hydration guard files", () => {
  const allowed = [
    "src/hooks/use-page-visibility.ts",
    "src/components/lightweight-route-shell.tsx",
    "src/components/persona-provider.tsx",
    "src/components/page-momentum-rail.tsx",
    "src/components/persona-workspace-gate.tsx",
    "scripts/recruiter-page-error-root-cause.test.ts",
    "package.json",
  ];
  for (const rel of allowed) {
    assert.ok(read(rel).length > 0, `expected frontend/${rel}`);
  }
  const smokeYml = readFileSync(join(repoRoot, ".github/workflows/smoke.yml"), "utf8");
  assert.doesNotMatch(smokeYml, /recruiter-page-error-root-cause/);
});

test("7 package registers recruiter page-error root-cause guard", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:recruiter-page-error-root-cause/);
});
