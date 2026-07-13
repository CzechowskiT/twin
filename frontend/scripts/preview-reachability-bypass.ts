#!/usr/bin/env npx tsx
/**
 * Preview reachability (with Vercel protection bypass headers).
 *
 * Constraints:
 * - Never prints bypass secret.
 * - Writes SHA-bound evidence under reports/founder-path-a/.
 * - Stops at first FAIL.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ProbeResult = {
  label: string;
  url: string;
  status: number | "ERROR";
  ok: boolean;
  finalUrl?: string;
  error?: string;
  blockedBySsoRedirect?: boolean;
};

type Evidence = {
  generatedUtc: string;
  repoHead: string;
  previews: Array<{
    label: string;
    baseUrl: string;
    results: ProbeResult[];
  }>;
  overall: "PASS" | "FAIL";
  stopRule: "Stop at first real FAIL";
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function resolveRepoHead(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
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
  if (!secret) {
    throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET missing in frontend/.env.local");
  }
  return secret;
}

async function probe(url: string, secret: string): Promise<ProbeResult> {
  try {
    const seed = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "x-vercel-protection-bypass": secret,
        "x-vercel-set-bypass-cookie": "true",
      },
    });
    const setCookie = seed.headers.get("set-cookie") || "";
    const jwtMatch = /(?:^|;\s*)_vercel_jwt=([^;]+)/.exec(setCookie);
    const vercelJwt = jwtMatch?.[1];

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "x-vercel-protection-bypass": secret,
        ...(vercelJwt ? { cookie: `_vercel_jwt=${vercelJwt}` } : {}),
      },
    });
    const finalUrl = res.url;
    const blockedBySsoRedirect = /vercel\.com\/sso-api/i.test(finalUrl);
    const ok = res.status >= 200 && res.status < 400 && !blockedBySsoRedirect;
    return {
      label: "",
      url,
      status: res.status,
      ok,
      finalUrl,
      blockedBySsoRedirect: blockedBySsoRedirect || undefined,
    };
  } catch (err) {
    return {
      label: "",
      url,
      status: "ERROR",
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatEvidenceMd(ev: Evidence): string {
  const lines: string[] = [
    "# Founder Path A — preview reachability with Vercel bypass",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generated (UTC) | ${ev.generatedUtc} |`,
    `| repo_head | ${ev.repoHead} |`,
    `| Result | **${ev.overall}** |`,
    `| Stop rule | ${ev.stopRule} |`,
    "",
  ];

  for (const p of ev.previews) {
    lines.push(`## Target: ${p.label}`);
    lines.push("");
    lines.push(`Base: \`${p.baseUrl}\``);
    lines.push("");
    lines.push("| URL | Status | Final URL | Result |");
    lines.push("|-----|--------|-----------|--------|");
    for (const r of p.results) {
      const finalUrl = r.finalUrl ? `\`${r.finalUrl}\`` : "";
      const status = typeof r.status === "number" ? String(r.status) : r.status;
      const res = r.ok ? "PASS" : "FAIL";
      lines.push(`| \`${r.url}\` | ${status} | ${finalUrl} | **${res}** |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const secret = loadBypassSecretFromFrontendEnvLocal();
  const repoHead = resolveRepoHead();

  const previewUrls: Array<{ label: string; baseUrl: string }> = [
    {
      label: "preview-449",
      baseUrl:
        process.env.TWIN_PREVIEW_URL_449 ??
        "https://twin-git-feat-all-modules-green-wave-c1-recruiter-a-26266f-twin.vercel.app",
    },
    {
      label: "preview-450",
      baseUrl:
        process.env.TWIN_PREVIEW_URL_450 ??
        "https://twin-git-feat-all-modules-green-wave-c2-talent-pool-0350d9-twin.vercel.app",
    },
  ];

  const paths = ["/api/public-health", "/"] as const;
  const previews: Evidence["previews"] = [];

  for (const p of previewUrls) {
    const base = p.baseUrl.replace(/\/$/, "");
    const results: ProbeResult[] = [];
    for (const path of paths) {
      const url = `${base}${path}`;
      const r = await probe(url, secret);
      results.push({ ...r, label: p.label, url });
      if (!r.ok) {
        previews.push({ label: p.label, baseUrl: base, results });
        const ev: Evidence = {
          generatedUtc: new Date().toISOString(),
          repoHead,
          previews,
          overall: "FAIL",
          stopRule: "Stop at first real FAIL",
        };
        const outDir = join(repoRoot, "reports", "founder-path-a", repoHead.slice(0, 12));
        mkdirSync(outDir, { recursive: true });
        const stamp = ev.generatedUtc.replace(/[:.]/g, "-");
        const jsonPath = join(outDir, `preview-reachability-bypass-${stamp}.json`);
        const mdPath = join(outDir, `preview-reachability-bypass-${stamp}.md`);
        writeFileSync(jsonPath, JSON.stringify(ev, null, 2));
        writeFileSync(mdPath, formatEvidenceMd(ev));
        console.log(`FAIL (evidence written): ${mdPath}`);
        process.exit(1);
      }
    }
    previews.push({ label: p.label, baseUrl: base, results });
  }

  const ev: Evidence = {
    generatedUtc: new Date().toISOString(),
    repoHead,
    previews,
    overall: "PASS",
    stopRule: "Stop at first real FAIL",
  };
  const outDir = join(repoRoot, "reports", "founder-path-a", repoHead.slice(0, 12));
  mkdirSync(outDir, { recursive: true });
  const stamp = ev.generatedUtc.replace(/[:.]/g, "-");
  const jsonPath = join(outDir, `preview-reachability-bypass-${stamp}.json`);
  const mdPath = join(outDir, `preview-reachability-bypass-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(ev, null, 2));
  writeFileSync(mdPath, formatEvidenceMd(ev));
  console.log(`PASS (evidence written): ${mdPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

