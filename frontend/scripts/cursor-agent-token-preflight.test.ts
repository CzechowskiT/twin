/**
 * Cursor-agent TWIN_ACCESS_TOKEN loading preflight — static, no browser.
 *
 * Verifies the safe local-env loader (`load-local-test-env.ts`) behaves
 * correctly and never logs/returns secret values, without requiring
 * TWIN_ACCESS_TOKEN to actually be present. Also re-runs the safe
 * diagnostics from the founder-facing doc as automated assertions.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  DEFAULT_FRONTEND_ENV_LOCAL_PATH,
  DEFAULT_ROOT_ENV_LOCAL_PATH,
  loadLocalTestEnv,
} from "../e2e/helpers/load-local-test-env";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function withTmpDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "twin-token-preflight-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("1 loader module exists and resolves default paths under repo root", () => {
  assert.ok(DEFAULT_ROOT_ENV_LOCAL_PATH.endsWith(".env.local"));
  assert.ok(DEFAULT_FRONTEND_ENV_LOCAL_PATH.endsWith(".env.local"));
  assert.ok(DEFAULT_FRONTEND_ENV_LOCAL_PATH.includes(`${join("frontend", ".env.local")}`));
  assert.ok(!DEFAULT_ROOT_ENV_LOCAL_PATH.includes(`${join("frontend", ".env.local")}`));
});

test("2 loads KEY=VALUE from a fixture root env file into a fake target env", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(rootEnvPath, "FOO=bar\n# comment\n\nBAZ=\"quoted value\"\n");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.FOO, "bar");
    assert.equal(targetEnv.BAZ, "quoted value");
    assert.equal(result.loadedFiles.length, 1);
    assert.equal(result.sourceCandidates.rootEnvLocal, true);
    assert.equal(result.sourceCandidates.frontendEnvLocal, false);
  });
});

test("3 process.env / caller-supplied values take precedence over file contents", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(rootEnvPath, "TWIN_ACCESS_TOKEN=file-value-should-not-win\n");
    const targetEnv: Record<string, string | undefined> = { TWIN_ACCESS_TOKEN: "already-set" };
    loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.TWIN_ACCESS_TOKEN, "already-set");
  });
});

test("3b an existing empty-string value does not block a real file value (empty is not \"set\")", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(frontendEnvPath, "TWIN_ACCESS_TOKEN=real-fixture-value\n");
    const targetEnv: Record<string, string | undefined> = { TWIN_ACCESS_TOKEN: "" };
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.TWIN_ACCESS_TOKEN, "real-fixture-value");
    assert.equal(result.tokenPresent, true);
  });
});

test("3c export prefix tolerates tabs/multiple spaces, not just a single space", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(frontendEnvPath, "export\tTWIN_ACCESS_TOKEN=tabbed-export-value\n");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.TWIN_ACCESS_TOKEN, "tabbed-export-value");
    assert.equal(result.tokenPresent, true);
  });
});

test("3d a leading UTF-8 BOM on the first line does not hide its key", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(frontendEnvPath, "\uFEFFTWIN_ACCESS_TOKEN=bom-prefixed-value\n");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.TWIN_ACCESS_TOKEN, "bom-prefixed-value");
    assert.equal(result.tokenPresent, true);
  });
});

test("4 deterministic order — root .env.local loads before frontend/.env.local", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(rootEnvPath, "SHARED_KEY=from-root\n");
    writeFileSync(frontendEnvPath, "SHARED_KEY=from-frontend\nFRONTEND_ONLY=yes\n");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(targetEnv.SHARED_KEY, "from-root", "root value must win — loaded first");
    assert.equal(targetEnv.FRONTEND_ONLY, "yes");
    assert.deepEqual(result.loadedFiles, [rootEnvPath, frontendEnvPath]);
  });
});

test("5 missing files are a no-op — never throws, tokenPresent false", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "does-not-exist-root.env.local");
    const frontendEnvPath = join(dir, "does-not-exist-frontend.env.local");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.deepEqual(result.loadedFiles, []);
    assert.equal(result.tokenPresent, false);
    assert.equal(result.sourceCandidates.rootEnvLocal, false);
    assert.equal(result.sourceCandidates.frontendEnvLocal, false);
  });
});

test("6 tokenPresent reflects TWIN_ACCESS_TOKEN presence without exposing its value", () => {
  withTmpDir((dir) => {
    const rootEnvPath = join(dir, "root.env.local");
    const frontendEnvPath = join(dir, "frontend.env.local");
    writeFileSync(frontendEnvPath, "TWIN_ACCESS_TOKEN=some-fixture-value\n");
    const targetEnv: Record<string, string | undefined> = {};
    const result = loadLocalTestEnv({ rootEnvPath, frontendEnvPath, targetEnv });
    assert.equal(result.tokenPresent, true);
    assert.equal(JSON.stringify(result).includes("some-fixture-value"), false);
  });
});

test("7 loader source never logs env values — no console.* of parsed content", () => {
  const source = read("e2e/helpers/load-local-test-env.ts");
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)/);
});

test("8 current agent shell diagnostics — booleans only, no secret exposure (Part A)", () => {
  const nodeTokenPresent = Boolean(process.env.TWIN_ACCESS_TOKEN);
  const rootEnvLocalExists = existsSync(DEFAULT_ROOT_ENV_LOCAL_PATH);
  const frontendEnvLocalExists = existsSync(DEFAULT_FRONTEND_ENV_LOCAL_PATH);
  assert.equal(typeof nodeTokenPresent, "boolean");
  assert.equal(typeof rootEnvLocalExists, "boolean");
  assert.equal(typeof frontendEnvLocalExists, "boolean");

  const loaded = loadLocalTestEnv({ targetEnv: {} });
  assert.equal(typeof loaded.tokenPresent, "boolean");
});

test("9 .gitignore coverage — .env.local ignored at root and frontend; not tracked", () => {
  const rootGitignore = readRepo(".gitignore");
  assert.match(rootGitignore, /^\.env\.local$/m);
  const frontendGitignore = readRepo("frontend/.gitignore");
  assert.match(frontendGitignore, /^\.env\*$/m);
  const tracked = execSync("git ls-files .env.local frontend/.env.local", {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  assert.equal(tracked, "", "no .env.local file must ever be committed");
});

test("10 phase3b spec wires loadLocalTestEnv before reading TWIN_ACCESS_TOKEN", () => {
  const spec = read("e2e/phase3b-controlled-multitab.spec.ts");
  const importIndex = spec.indexOf('from "./helpers/load-local-test-env"');
  const loadCallIndex = spec.indexOf("loadLocalTestEnv();");
  const tokenReadIndex = spec.indexOf("process.env.TWIN_ACCESS_TOKEN");
  assert.ok(importIndex > -1, "spec must import loadLocalTestEnv");
  assert.ok(loadCallIndex > -1, "spec must call loadLocalTestEnv()");
  assert.ok(tokenReadIndex > -1, "spec must still read TWIN_ACCESS_TOKEN");
  assert.ok(importIndex < loadCallIndex, "import must precede call");
  assert.ok(loadCallIndex < tokenReadIndex, "loadLocalTestEnv() must run before TWIN_ACCESS_TOKEN is read");
});

test("11 npm script test:cursor-agent-token-preflight registered", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:cursor-agent-token-preflight/);
  assert.match(pkg, /cursor-agent-token-preflight\.test\.ts/);
});

test("12 no test in this file prints or asserts an actual token value", () => {
  const source = read("scripts/cursor-agent-token-preflight.test.ts");
  assert.doesNotMatch(source, /console\.(log|error|warn|info|debug)\([^)]*TWIN_ACCESS_TOKEN/);
});

test("13 companion doc exists — no secrets, states safety boundaries", () => {
  const doc = readRepo("docs/CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md");
  assert.match(doc, /Cursor Agent.*Token Loading/i);
  assert.match(doc, /load-local-test-env\.ts/);
  assert.match(doc, /No print\/log\/commit token values|never log/i);
  assert.match(doc, /Gate E.*(PENDING|FAIL|PARTIAL|BLOCKED)/i);
  assert.doesNotMatch(doc, /Gate E:\s*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /\| \*\*Gate E\*\* \|.*\*\*PASS\*\*/i);
  assert.doesNotMatch(doc, /Launch stance:\s*\*\*GO\*\*/i);
});
