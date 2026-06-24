/**
 * Prod smoke commit gate — compares Vercel frontend_commit to repo HEAD.
 * Docs-only drift between prod deploy and HEAD is acceptable; source changes are not.
 */
import { execSync } from "node:child_process";

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");

export type ProdSmokeAlignmentStatus = "aligned" | "acceptable_docs_only_drift" | "failed_alignment";

export type ProdSmokeCommitGate = {
  prod_frontend_commit: string;
  prod_api_commit: string;
  repo_head: string;
  commit_interpretation: string;
  docs_only_drift: boolean;
  alignment_status: ProdSmokeAlignmentStatus;
};

type PublicHealthPayload = {
  frontend_commit?: string;
  api_commit?: string;
  commit_interpretation?: string;
};

function repoHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function shortSha(sha: string): string {
  return sha === "unknown" ? "unknown" : sha.slice(0, 7);
}

function shasAligned(a: string, b: string): boolean {
  if (a === "unknown" || b === "unknown") return false;
  const shortA = shortSha(a);
  const shortB = shortSha(b);
  return a.startsWith(shortB) || b.startsWith(shortA) || shortA === shortB;
}

/** Paths changed between prod frontend deploy and repo HEAD (empty when aligned). */
export function changedPathsSinceProdCommit(prodCommit: string, toRef = "HEAD"): string[] {
  if (prodCommit === "unknown") return [];
  try {
    const out = execSync(`git diff --name-only ${prodCommit}..${toRef}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function isDocsOnlyDrift(paths: readonly string[]): boolean {
  return paths.length > 0 && paths.every((p) => p.startsWith("docs/"));
}

export function resolveAlignmentStatus(
  prodFrontendCommit: string,
  head: string,
  changedPaths: readonly string[],
): ProdSmokeAlignmentStatus {
  if (shasAligned(prodFrontendCommit, head)) return "aligned";
  if (isDocsOnlyDrift(changedPaths)) return "acceptable_docs_only_drift";
  return "failed_alignment";
}

export async function fetchPublicHealth(base = PROD_BASE): Promise<PublicHealthPayload> {
  const res = await fetch(`${base}/api/public-health`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`public-health HTTP ${res.status}`);
  return (await res.json()) as PublicHealthPayload;
}

export async function evaluateProdSmokeCommitGate(base = PROD_BASE): Promise<ProdSmokeCommitGate> {
  const health = await fetchPublicHealth(base);
  const prodFrontendCommit = String(health.frontend_commit ?? "unknown");
  const prodApiCommit = String(health.api_commit ?? "unknown");
  const head = repoHead();
  const changed = changedPathsSinceProdCommit(prodFrontendCommit);
  const docsOnly = isDocsOnlyDrift(changed);
  const alignmentStatus = resolveAlignmentStatus(prodFrontendCommit, head, changed);
  const baseInterpretation = String(
    health.commit_interpretation ??
      "Compare scaffold HEAD, Vercel frontend_commit, and Railway api_commit separately.",
  );
  let commitInterpretation = baseInterpretation;
  if (alignmentStatus === "acceptable_docs_only_drift") {
    commitInterpretation = `${baseInterpretation} Acceptable docs-only drift between prod frontend_commit and repo HEAD.`;
  } else if (alignmentStatus === "failed_alignment") {
    commitInterpretation = `${baseInterpretation} Failed alignment — non-docs changes between prod frontend_commit and repo HEAD.`;
  }
  return {
    prod_frontend_commit: prodFrontendCommit,
    prod_api_commit: prodApiCommit,
    repo_head: head,
    commit_interpretation: commitInterpretation,
    docs_only_drift: docsOnly,
    alignment_status: alignmentStatus,
  };
}

export function formatProdSmokeCommitGate(gate: ProdSmokeCommitGate): string {
  return JSON.stringify(gate, null, 2);
}

export function assertProdSmokeCommitGateAllowsRun(gate: ProdSmokeCommitGate): void {
  if (gate.alignment_status === "failed_alignment") {
    throw new Error(
      `Prod smoke commit gate: failed alignment (prod_frontend_commit=${gate.prod_frontend_commit}, repo_head=${gate.repo_head})`,
    );
  }
}

/** Emit gate fields for operator logs (stdout). */
export async function logProdSmokeCommitGate(base = PROD_BASE): Promise<ProdSmokeCommitGate> {
  const gate = await evaluateProdSmokeCommitGate(base);
  console.log(formatProdSmokeCommitGate(gate));
  return gate;
}
