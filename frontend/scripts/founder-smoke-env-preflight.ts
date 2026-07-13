#!/usr/bin/env npx tsx
/**
 * Founder smoke env preflight — reports SET/UNSET only, never secret values.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export type EnvCheck = {
  name: string;
  status: "SET" | "UNSET";
  source?: "process" | "root-env-local" | "frontend-env-local";
};

export const FOUNDER_SMOKE_ENV_VARS = [
  "DEMO_USER_PASSWORD",
  "RECRUITER_TOKEN",
  "TWIN_RECRUITER_TOKEN",
] as const;

function loadDotEnvKeys(path: string): Set<string> {
  if (!existsSync(path)) return new Set();
  const keys = new Set<string>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (value.length > 0) keys.add(key);
  }
  return keys;
}

export function checkFounderSmokeEnv(
  env: NodeJS.ProcessEnv = process.env,
  opts?: { rootEnvLocal?: string; frontendEnvLocal?: string },
): EnvCheck[] {
  const rootPath = opts?.rootEnvLocal ?? join(repoRoot, ".env.local");
  const frontendPath = opts?.frontendEnvLocal ?? join(repoRoot, "frontend", ".env.local");
  const rootKeys = loadDotEnvKeys(rootPath);
  const frontendKeys = loadDotEnvKeys(frontendPath);

  return FOUNDER_SMOKE_ENV_VARS.map((name) => {
    if (env[name] !== undefined && env[name] !== "") {
      return { name, status: "SET" as const, source: "process" as const };
    }
    if (frontendKeys.has(name)) {
      return { name, status: "SET" as const, source: "frontend-env-local" as const };
    }
    if (rootKeys.has(name)) {
      return { name, status: "SET" as const, source: "root-env-local" as const };
    }
    return { name, status: "UNSET" as const };
  });
}

export function formatFounderSmokeEnvReport(checks: EnvCheck[]): string {
  const lines = ["Founder smoke env preflight (SET/UNSET only — no values):"];
  for (const c of checks) {
    const src = c.source ? ` (${c.source})` : "";
    lines.push(`  ${c.name}: ${c.status}${src}`);
  }
  const candidateReady = checks.find((c) => c.name === "DEMO_USER_PASSWORD")?.status === "SET";
  const recruiterReady = checks.some(
    (c) =>
      (c.name === "RECRUITER_TOKEN" || c.name === "TWIN_RECRUITER_TOKEN") && c.status === "SET",
  );
  lines.push("");
  lines.push(`Wave B candidate smoke: ${candidateReady ? "CREDENTIALS_PRESENT" : "BLOCKED"}`);
  lines.push(`Wave C recruiter smoke: ${recruiterReady ? "CREDENTIALS_PRESENT" : "BLOCKED"}`);
  lines.push("Smoke executed: NO (preflight only — no fake PASS)");
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const checks = checkFounderSmokeEnv(process.env);
  console.log(formatFounderSmokeEnvReport(checks));
  const blocked =
    checks.every((c) => c.status === "UNSET") ||
    !checks.some((c) => c.status === "SET");
  process.exit(blocked ? 2 : 0);
}
