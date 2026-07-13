#!/usr/bin/env npx tsx
/**
 * Production public probe suite — 100+ safe GET probes, latency percentiles, evidence JSON/MD.
 * No auth, no mutations. Path B safe.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PROD_PUBLIC_API_ROUTES,
  PROD_PUBLIC_FE_ROUTES,
  PROD_RAILWAY_API_ROUTES,
  RAILWAY_API_BASE,
  VERCEL_FE_BASE,
} from "./lib/prod-public-probe-routes";

export type ProbeResult = {
  url: string;
  status: number | "ERROR";
  ms: number;
  ok: boolean;
  error?: string;
};

export type ProbeReport = {
  startedUtc: string;
  finishedUtc: string;
  feBase: string;
  apiBase: string;
  totalProbes: number;
  passCount: number;
  failCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  feSha?: string;
  apiSha?: string;
  dbOk?: boolean;
  probes: ProbeResult[];
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export async function probeOnce(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Date.now() - start;
    return { url, status: res.status, ms, ok: res.status >= 200 && res.status < 400 };
  } catch (err) {
    return {
      url,
      status: "ERROR",
      ms: Date.now() - start,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Build probe list: each route × repeat factor to exceed 100 probes. */
export function buildProbeUrls(repeatsPerRoute = 5): string[] {
  const urls: string[] = [];
  for (const path of PROD_PUBLIC_FE_ROUTES) {
    for (let i = 0; i < repeatsPerRoute; i++) {
      urls.push(`${VERCEL_FE_BASE}${path}`);
    }
  }
  for (const path of PROD_PUBLIC_API_ROUTES) {
    for (let i = 0; i < repeatsPerRoute; i++) {
      urls.push(`${VERCEL_FE_BASE}${path}`);
    }
  }
  for (const path of PROD_RAILWAY_API_ROUTES) {
    for (let i = 0; i < repeatsPerRoute; i++) {
      urls.push(`${RAILWAY_API_BASE}${path}`);
    }
  }
  return urls;
}

export async function runProbeSuite(repeatsPerRoute = 5): Promise<ProbeReport> {
  const startedUtc = new Date().toISOString();
  const urls = buildProbeUrls(repeatsPerRoute);
  const probes: ProbeResult[] = [];
  for (const url of urls) {
    probes.push(await probeOnce(url));
  }
  const latencies = probes.map((p) => p.ms).sort((a, b) => a - b);
  const passCount = probes.filter((p) => p.ok).length;
  const failCount = probes.length - passCount;

  let feSha: string | undefined;
  let apiSha: string | undefined;
  let dbOk: boolean | undefined;
  try {
    const healthRes = await fetch(`${VERCEL_FE_BASE}/api/public-health`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (healthRes.ok) {
      const body = (await healthRes.json()) as Record<string, unknown>;
      feSha = String(body.frontend_commit ?? "");
      apiSha = String(body.api_commit ?? body.git_commit ?? "");
      dbOk = body.db_ok === true;
    }
  } catch {
    /* traceability optional */
  }

  return {
    startedUtc,
    finishedUtc: new Date().toISOString(),
    feBase: VERCEL_FE_BASE,
    apiBase: RAILWAY_API_BASE,
    totalProbes: probes.length,
    passCount,
    failCount,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    feSha,
    apiSha,
    dbOk,
    probes,
  };
}

function formatMd(report: ProbeReport): string {
  const lines = [
    "# Production public probe report",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Started (UTC) | ${report.startedUtc} |`,
    `| Finished (UTC) | ${report.finishedUtc} |`,
    `| Total probes | ${report.totalProbes} |`,
    `| PASS | ${report.passCount} |`,
    `| FAIL | ${report.failCount} |`,
    `| p50 | ${report.p50Ms}ms |`,
    `| p95 | ${report.p95Ms}ms |`,
    `| p99 | ${report.p99Ms}ms |`,
    `| FE SHA (public-health) | ${report.feSha ?? "n/a"} |`,
    `| API SHA (public-health) | ${report.apiSha ?? "n/a"} |`,
    `| db_ok | ${report.dbOk ?? "n/a"} |`,
    "",
  ];
  if (report.failCount > 0) {
    lines.push("## Failures", "");
    for (const p of report.probes.filter((x) => !x.ok)) {
      lines.push(`- ${p.url} → ${p.status} ${p.error ?? ""}`);
    }
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const repeats = Number(process.env.PROBE_REPEATS ?? "5");
  console.log(`=== Production public probe suite (${repeats}× per route) ===\n`);
  const report = await runProbeSuite(repeats);
  console.log(`Probes: ${report.totalProbes} | PASS: ${report.passCount} | FAIL: ${report.failCount}`);
  console.log(`Latency p50=${report.p50Ms}ms p95=${report.p95Ms}ms p99=${report.p99Ms}ms`);
  console.log(`SHA: fe=${report.feSha?.slice(0, 12) ?? "n/a"} api=${report.apiSha?.slice(0, 12) ?? "n/a"} db_ok=${report.dbOk}`);

  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const outDir = join(repoRoot, "reports", "prod-probes");
  mkdirSync(outDir, { recursive: true });
  const stamp = report.startedUtc.replace(/[:.]/g, "-");
  const jsonPath = join(outDir, `prod-probes-${stamp}.json`);
  const mdPath = join(outDir, `prod-probes-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, formatMd(report));
  console.log(`\nEvidence: ${jsonPath}`);
  process.exit(report.failCount > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
