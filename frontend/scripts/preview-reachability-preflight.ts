#!/usr/bin/env npx tsx
/**
 * Preview reachability preflight — public routes only, no auth bypass.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ReachabilityTarget = {
  label: string;
  baseUrl: string;
  paths: string[];
};

export type ReachabilityResult = {
  label: string;
  url: string;
  status: number | "ERROR";
  ok: boolean;
  error?: string;
};

export const DEFAULT_PUBLIC_PATHS = [
  "/api/public-health",
  "/",
  "/login/candidate",
  "/login/recruiter",
] as const;

export const PREVIEW_ENV_KEYS = [
  "TWIN_PREVIEW_URL_448",
  "TWIN_PREVIEW_URL_449",
  "TWIN_PREVIEW_URL_450",
] as const;

const PROD_BASE = "https://twin-sooty.vercel.app";

export function resolveReachabilityTargets(
  env: NodeJS.ProcessEnv = process.env,
): ReachabilityTarget[] {
  const targets: ReachabilityTarget[] = [
    { label: "prod", baseUrl: PROD_BASE, paths: [...DEFAULT_PUBLIC_PATHS] },
  ];
  for (const key of PREVIEW_ENV_KEYS) {
    const base = env[key]?.replace(/\/$/, "");
    if (base) {
      targets.push({
        label: key.replace("TWIN_PREVIEW_URL_", "preview-"),
        baseUrl: base,
        paths: ["/api/public-health", "/"],
      });
    }
  }
  return targets;
}

export async function probeUrl(url: string, fetchFn: typeof fetch = fetch): Promise<ReachabilityResult> {
  try {
    const res = await fetchFn(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    return {
      label: "",
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
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

export async function runReachabilityPreflight(
  targets: ReachabilityTarget[],
  fetchFn: typeof fetch = fetch,
): Promise<ReachabilityResult[]> {
  const results: ReachabilityResult[] = [];
  for (const target of targets) {
    for (const path of target.paths) {
      const url = `${target.baseUrl.replace(/\/$/, "")}${path}`;
      const result = await probeUrl(url, fetchFn);
      results.push({ ...result, label: target.label, url });
    }
  }
  return results;
}

export function formatReachabilityReport(results: ReachabilityResult[]): string {
  const lines = ["Preview reachability preflight (public routes, no auth):"];
  for (const r of results) {
    const detail = r.error ? ` ERROR (${r.error})` : "";
    lines.push(`  [${r.label}] ${r.url} → ${r.status}${r.ok ? " OK" : " FAIL"}${detail}`);
  }
  const allOk = results.every((r) => r.ok);
  lines.push("");
  lines.push(`Overall: ${allOk ? "REACHABLE" : "BLOCKED_OR_DEGRADED"}`);
  if (!results.some((r) => r.label.startsWith("preview-"))) {
    lines.push("Preview URLs: UNSET (set TWIN_PREVIEW_URL_448/449/450 to probe PR previews)");
  }
  return lines.join("\n");
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("preview-reachability-preflight.ts");

if (isMain) {
  const targets = resolveReachabilityTargets(process.env);
  runReachabilityPreflight(targets)
    .then((results) => {
      console.log(formatReachabilityReport(results));
      process.exit(results.every((r) => r.ok) ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
