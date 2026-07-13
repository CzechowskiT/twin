#!/usr/bin/env npx tsx
/**
 * Founder smoke orchestration — env validation, SHA binding, evidence JSON/MD output.
 * Does NOT execute authenticated browser smoke or record PASS.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkFounderSmokeEnv,
  formatFounderSmokeEnvReport,
} from "./founder-smoke-env-preflight";
import {
  formatReachabilityReport,
  resolveReachabilityTargets,
  runReachabilityPreflight,
} from "./preview-reachability-preflight";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HANDOFF = "docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md";

export type FounderSmokeEvidence = {
  generatedUtc: string;
  repoHead: string;
  credentials: {
    demoUserPassword: "SET" | "UNSET";
    recruiterToken: "SET" | "UNSET";
    waveBBlocked: boolean;
    waveCBlocked: boolean;
  };
  reachability: Array<{ label: string; url: string; status: number | "ERROR"; ok: boolean }>;
  deploySha?: string;
  smokeExecuted: false;
  blockedReason: string;
  smokeOrder: string[];
};

function resolveRepoHead(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function fetchDeploySha(): Promise<string | undefined> {
  try {
    const res = await fetch("https://twin-sooty.vercel.app/api/public-health", {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as Record<string, unknown>;
    return String(body.api_commit ?? body.git_commit ?? "");
  } catch {
    return undefined;
  }
}

function formatEvidenceMd(ev: FounderSmokeEvidence): string {
  return [
    "# Founder smoke orchestration evidence",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated (UTC) | ${ev.generatedUtc} |`,
    `| repo_head | ${ev.repoHead} |`,
    `| deploy_sha | ${ev.deploySha ?? "n/a"} |`,
    `| DEMO_USER_PASSWORD | ${ev.credentials.demoUserPassword} |`,
    `| RECRUITER_TOKEN | ${ev.credentials.recruiterToken} |`,
    `| Wave B | ${ev.credentials.waveBBlocked ? "BLOCKED" : "READY"} |`,
    `| Wave C | ${ev.credentials.waveCBlocked ? "BLOCKED" : "READY"} |`,
    `| Smoke executed | NO |`,
    `| Blocked reason | ${ev.blockedReason} |`,
    "",
    "## Smoke order (when credentials SET)",
    ...ev.smokeOrder.map((s) => `- ${s}`),
  ].join("\n");
}

async function main(): Promise<void> {
  console.log("=== Founder smoke orchestration (preflight only) ===\n");
  const envChecks = checkFounderSmokeEnv(process.env);
  console.log(formatFounderSmokeEnvReport(envChecks));
  console.log("");

  const targets = resolveReachabilityTargets(process.env);
  const reachResults = await runReachabilityPreflight(targets);
  console.log(formatReachabilityReport(reachResults));
  console.log("");

  const deploySha = await fetchDeploySha();
  const waveBBlocked = envChecks.some((c) => c.name === "DEMO_USER_PASSWORD" && c.status === "UNSET");
  const waveCBlocked = !envChecks.some(
    (c) =>
      (c.name === "RECRUITER_TOKEN" || c.name === "TWIN_RECRUITER_TOKEN") && c.status === "SET",
  );
  const blockedReason =
    waveBBlocked && waveCBlocked
      ? "DEMO_USER_PASSWORD and recruiter token UNSET"
      : waveBBlocked
        ? "DEMO_USER_PASSWORD UNSET"
        : waveCBlocked
          ? "recruiter token UNSET"
          : "none — founder may run browser smoke";

  const evidence: FounderSmokeEvidence = {
    generatedUtc: new Date().toISOString(),
    repoHead: resolveRepoHead(),
    credentials: {
      demoUserPassword: waveBBlocked ? "UNSET" : "SET",
      recruiterToken: waveCBlocked ? "UNSET" : "SET",
      waveBBlocked,
      waveCBlocked,
    },
    reachability: reachResults.map((r) => ({
      label: r.label,
      url: r.url,
      status: r.status,
      ok: r.ok,
    })),
    deploySha,
    smokeExecuted: false,
    blockedReason,
    smokeOrder: [
      "Wave B B1/B2 on prod (DEMO_USER_PASSWORD)",
      "Wave C C1 on #449 preview (recruiter token)",
      "Merge #449 → rebase #450 → Wave C C2",
      "Merge #450 → rebase #448 → Wave B B3",
      "Train #451→#452→#453→#454→#455 after smoke PASS",
    ],
  };

  const outDir = join(repoRoot, "reports", "founder-smoke");
  mkdirSync(outDir, { recursive: true });
  const stamp = evidence.generatedUtc.replace(/[:.]/g, "-");
  const jsonPath = join(outDir, `founder-smoke-${stamp}.json`);
  const mdPath = join(outDir, `founder-smoke-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
  writeFileSync(mdPath, formatEvidenceMd(evidence));
  console.log(`Evidence JSON: ${jsonPath}`);
  console.log(`Evidence MD:   ${mdPath}`);
  console.log(`\nDeploy SHA: ${deploySha?.slice(0, 12) ?? "n/a"}`);
  console.log(`Blocked: ${blockedReason}`);
  console.log("\nSmoke executed: NO — preflight orchestration only.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
