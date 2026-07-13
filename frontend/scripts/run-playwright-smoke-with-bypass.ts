#!/usr/bin/env npx tsx
/**
 * Run Playwright smoke against a base URL with Vercel bypass.
 *
 * Constraints:
 * - Never prints bypass secret.
 * - Writes SHA-bound evidence under reports/founder-path-a/.
 * - Stops at first FAIL.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type RunLabel = "wave-b" | "wave-c-preview-449" | "wave-c-preview-450";

type Evidence = {
  generatedUtc: string;
  repoHead: string;
  label: RunLabel;
  baseUrl: string;
  command: string;
  exitCode: number;
  result: "PASS" | "FAIL";
  reportsDir: string;
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function resolveRepoHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readEnvLocalValue(path: string, key: string): string | undefined {
  if (!existsSync(path)) return undefined;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k !== key) continue;
    const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!v) return undefined;
    return v;
  }
  return undefined;
}

function loadBypassSecretFromFrontendEnvLocal(): string {
  const envLocal = join(repoRoot, "frontend", ".env.local");
  const secret = readEnvLocalValue(envLocal, "VERCEL_AUTOMATION_BYPASS_SECRET") ?? "";
  if (!secret) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET missing in frontend/.env.local");
  return secret;
}

function formatEvidenceMd(ev: Evidence): string {
  return [
    `# Founder Path A — Playwright smoke (${ev.label})`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated (UTC) | ${ev.generatedUtc} |`,
    `| repo_head | ${ev.repoHead} |`,
    `| base_url | \`${ev.baseUrl}\` |`,
    `| Result | **${ev.result}** |`,
    `| Exit code | ${ev.exitCode} |`,
    "",
    "## Command",
    "",
    "```bash",
    ev.command,
    "```",
    "",
    `## Artifacts`,
    "",
    `- Output dir: \`${ev.reportsDir}\``,
  ].join("\n");
}

function runOne(label: RunLabel, baseUrl: string): Evidence {
  const repoHead = resolveRepoHead();
  const secret = loadBypassSecretFromFrontendEnvLocal();
  const outRoot = join(repoRoot, "reports", "founder-path-a", repoHead.slice(0, 12), "playwright");
  mkdirSync(outRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(outRoot, `${label}-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_VERCEL_BYPASS_SECRET: secret,
  };

  const args = [
    "playwright",
    "test",
    "e2e/smoke.spec.ts",
    "--workers=1",
    "--trace=on",
    `--output=${outDir}`,
    "--reporter=line,json",
  ];

  const cmdForEvidence = `cd frontend && PLAYWRIGHT_BASE_URL=${baseUrl} PLAYWRIGHT_VERCEL_BYPASS_SECRET=*** npx ${args.join(
    " ",
  )}`;

  let exitCode = 0;
  try {
    execFileSync("npx", ["--yes", ...args], {
      cwd: join(repoRoot, "frontend"),
      env,
      stdio: "inherit",
    });
  } catch (err: any) {
    exitCode = typeof err?.status === "number" ? err.status : 1;
  }

  const ev: Evidence = {
    generatedUtc: new Date().toISOString(),
    repoHead,
    label,
    baseUrl,
    command: cmdForEvidence,
    exitCode,
    result: exitCode === 0 ? "PASS" : "FAIL",
    reportsDir: outDir,
  };

  const jsonPath = join(outDir, `evidence.json`);
  const mdPath = join(outDir, `evidence.md`);
  writeFileSync(jsonPath, JSON.stringify(ev, null, 2));
  writeFileSync(mdPath, formatEvidenceMd(ev));
  return ev;
}

function parseArgs(): { label: RunLabel; baseUrl: string } {
  const label = (process.argv[2] || "") as RunLabel;
  const baseUrl = process.argv[3] || "";
  if (!label || !baseUrl) {
    throw new Error(
      "Usage: run-playwright-smoke-with-bypass.ts <wave-b|wave-c-preview-449|wave-c-preview-450> <baseUrl>",
    );
  }
  return { label, baseUrl };
}

function main(): void {
  const { label, baseUrl } = parseArgs();
  const ev = runOne(label, baseUrl);
  console.log(`${ev.result} (evidence written): ${ev.reportsDir}`);
  process.exit(ev.exitCode);
}

main();

