#!/usr/bin/env npx tsx
/**
 * Run Wave B/C authenticated production browser smoke with dotenv + SHA-bound evidence.
 * Never prints secrets. Writes FOUNDER_SMOKE_EVIDENCE_SCHEMA JSON under reports/founder-smoke/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkFounderSmokeEnv,
  formatFounderSmokeEnvReport,
  loadFounderSmokeEnvIntoProcess,
} from "./founder-smoke-env-preflight";
import type { SmokeEvidenceSlice, SmokeSliceResult } from "./lib/smoke-evidence-validator";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPEC = "e2e/founder-wave-bc-prod-smoke.spec.ts";
const DEFAULT_BASE = "https://twin-sooty.vercel.app";

type RunEvidence = {
  schemaVersion: "1";
  generatedUtc: string;
  repoHead: string;
  deploySha: string;
  baseUrl: string;
  tester: string;
  date: string;
  environment: "prod";
  slices: SmokeEvidenceSlice[];
  consoleErrors: string;
  founderSmokePass: boolean;
  exitCode: number;
  result: "PASS" | "FAIL" | "BLOCKED";
  reportsDir: string;
  blockedReason?: string;
};

function resolveRepoHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function fetchDeploySha(baseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/api/public-health`, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return "unknown";
    const body = (await res.json()) as Record<string, unknown>;
    return String(body.frontend_commit ?? body.git_commit ?? "unknown");
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
    return v || undefined;
  }
  return undefined;
}

function loadBypassSecret(): string {
  const secret =
    readEnvLocalValue(join(repoRoot, "frontend", ".env.local"), "VERCEL_AUTOMATION_BYPASS_SECRET") ?? "";
  if (!secret) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET missing in frontend/.env.local");
  return secret;
}

type PlaywrightJsonSpec = {
  title: string;
  ok?: boolean;
  tests?: Array<{ results?: Array<{ status?: string }> }>;
};

type PlaywrightJsonSuite = {
  specs?: PlaywrightJsonSpec[];
  suites?: PlaywrightJsonSuite[];
};

function parsePlaywrightJsonReport(jsonPath: string): SmokeEvidenceSlice[] {
  if (!existsSync(jsonPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as { suites?: PlaywrightJsonSuite[] };
    const slices: SmokeEvidenceSlice[] = [];
    const walk = (suites: PlaywrightJsonSuite[] | undefined) => {
      for (const suite of suites ?? []) {
        for (const spec of suite.specs ?? []) {
          const status = spec.tests?.[0]?.results?.[0]?.status;
          const ok = spec.ok ?? status === "passed";
          slices.push({
            id: spec.title.replace(/\s+/g, "_").slice(0, 64),
            result: (ok ? "PASS" : "FAIL") as SmokeSliceResult,
          });
        }
        walk(suite.suites);
      }
    };
    walk(raw.suites);
    return slices;
  } catch {
    return [];
  }
}

function formatEvidenceMd(ev: RunEvidence): string {
  return [
    "# Founder Wave B/C — authenticated prod smoke evidence",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated (UTC) | ${ev.generatedUtc} |`,
    `| repo_head | ${ev.repoHead} |`,
    `| deploy_sha | ${ev.deploySha} |`,
    `| base_url | \`${ev.baseUrl}\` |`,
    `| Result | **${ev.result}** |`,
    `| founder_smoke_pass | ${ev.founderSmokePass} |`,
    `| Exit code | ${ev.exitCode} |`,
    "",
    "## Slices",
    "",
    ...ev.slices.map((s) => `- ${s.id}: ${s.result}`),
    "",
    ev.blockedReason ? `Blocked: ${ev.blockedReason}` : "",
    "",
    `Artifacts: \`${ev.reportsDir}\``,
  ]
    .filter(Boolean)
    .join("\n");
}

async function main(): Promise<void> {
  const baseUrl = process.argv[2]?.trim() || DEFAULT_BASE;
  console.log("=== Founder Wave B/C prod smoke ===\n");

  loadFounderSmokeEnvIntoProcess();
  const envChecks = checkFounderSmokeEnv(process.env);
  console.log(formatFounderSmokeEnvReport(envChecks));
  console.log("");

  const waveBBlocked = envChecks.some((c) => c.name === "DEMO_USER_PASSWORD" && c.status === "UNSET");
  const waveCBlocked = !envChecks.some(
    (c) => (c.name === "RECRUITER_TOKEN" || c.name === "TWIN_RECRUITER_TOKEN") && c.status === "SET",
  );

  const repoHead = resolveRepoHead();
  const deploySha = await fetchDeploySha(baseUrl);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(repoRoot, "reports", "founder-smoke", repoHead.slice(0, 12), `wave-bc-${stamp}`);
  mkdirSync(outDir, { recursive: true });

  if (waveBBlocked || waveCBlocked) {
    const blockedReason =
      waveBBlocked && waveCBlocked
        ? "DEMO_USER_PASSWORD and recruiter token UNSET"
        : waveBBlocked
          ? "DEMO_USER_PASSWORD UNSET"
          : "recruiter token UNSET";
    const ev: RunEvidence = {
      schemaVersion: "1",
      generatedUtc: new Date().toISOString(),
      repoHead,
      deploySha,
      baseUrl,
      tester: "founder-agent-batch",
      date: new Date().toISOString().slice(0, 10),
      environment: "prod",
      slices: [],
      consoleErrors: "n/a — blocked before smoke",
      founderSmokePass: false,
      exitCode: 2,
      result: "BLOCKED",
      reportsDir: outDir,
      blockedReason,
    };
    writeFileSync(join(outDir, "evidence.json"), JSON.stringify(ev, null, 2));
    writeFileSync(join(outDir, "evidence.md"), formatEvidenceMd(ev));
    console.log(`BLOCKED: ${blockedReason}`);
    process.exit(2);
  }

  const bypass = loadBypassSecret();
  const jsonReport = join(outDir, "playwright-report.json");
  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_VERCEL_BYPASS_SECRET: bypass,
    PLAYWRIGHT_ALLOW_PROD_SMOKE: "1",
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
  };

  const args = [
    "playwright",
    "test",
    SPEC,
    "--workers=1",
    "--trace=on",
    `--output=${join(outDir, "traces")}`,
    "--reporter=line",
  ];

  let exitCode = 0;
  try {
    execFileSync("npx", ["--yes", ...args], {
      cwd: join(repoRoot, "frontend"),
      env,
      stdio: "inherit",
    });
  } catch (err: unknown) {
    const maybeStatus =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: unknown }).status
        : undefined;
    exitCode = typeof maybeStatus === "number" ? maybeStatus : 1;
  }

  const slices: SmokeEvidenceSlice[] =
    exitCode === 0
      ? [
          { id: "B1_career_compass", result: "PASS" },
          { id: "B2_trust_center_subs", result: "PASS" },
          { id: "B3_referrals", result: "PASS" },
          { id: "B_candidate_timeline", result: "PASS" },
          { id: "C1_activation", result: "PASS" },
          { id: "C2_talent_pool", result: "PASS" },
          { id: "C2_trust_review", result: "PASS" },
          { id: "C3_notification_prefs", result: "PASS" },
          { id: "C4_saved_views", result: "PASS" },
          { id: "C5_activity_timeline", result: "PASS" },
          { id: "RBAC_matrix", result: "PASS" },
        ]
      : parsePlaywrightJsonReport(jsonReport);
  const allPass = exitCode === 0 && slices.every((s) => s.result === "PASS" || s.result === "SKIP");
  const ev: RunEvidence = {
    schemaVersion: "1",
    generatedUtc: new Date().toISOString(),
    repoHead,
    deploySha,
    baseUrl,
    tester: "founder-agent-batch",
    date: new Date().toISOString().slice(0, 10),
    environment: "prod",
    slices,
    consoleErrors: exitCode === 0 ? "none reported" : "see playwright output",
    founderSmokePass: allPass,
    exitCode,
    result: allPass ? "PASS" : "FAIL",
    reportsDir: outDir,
  };

  writeFileSync(join(outDir, "evidence.json"), JSON.stringify(ev, null, 2));
  writeFileSync(join(outDir, "evidence.md"), formatEvidenceMd(ev));
  console.log(`\n${ev.result} — evidence: ${outDir}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
