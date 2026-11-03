/**
 * Prod smoke commit gate — strict Gate F four-way SHA alignment.
 * repo_head === frontend_commit === api_commit === worker_commit required.
 * Docs-only drift still allowed only when FE matches HEAD and worker/api match FE.
 */
import { execSync } from "node:child_process";

import { shasStrictlyAligned } from "./deploy-alignment-poller";

const PROD_BASE = (process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app").replace(/\/$/, "");

export type ProdSmokeAlignmentStatus = "aligned" | "acceptable_docs_only_drift" | "failed_alignment";

export type ProdSmokeCommitGate = {
  prod_frontend_commit: string;
  prod_api_commit: string;
  prod_worker_commit: string;
  repo_head: string;
  commit_interpretation: string;
  docs_only_drift: boolean;
  alignment_status: ProdSmokeAlignmentStatus;
};

type PublicHealthPayload = {
  frontend_commit?: string;
  api_commit?: string;
  worker_commit?: string;
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
  prodApiCommit?: string,
  prodWorkerCommit?: string,
): ProdSmokeAlignmentStatus {
  // Legacy callers (unit tests) pass only FE vs HEAD.
  if (prodApiCommit === undefined && prodWorkerCommit === undefined) {
    if (shasAligned(prodFrontendCommit, head)) return "aligned";
    if (isDocsOnlyDrift(changedPaths)) return "acceptable_docs_only_drift";
    return "failed_alignment";
  }
  const fourWay = shasStrictlyAligned(
    head,
    prodFrontendCommit,
    prodApiCommit || "unknown",
    prodWorkerCommit || "unknown",
  );
  if (fourWay) return "aligned";
  if (shasAligned(prodFrontendCommit, head) && isDocsOnlyDrift(changedPaths)) {
    return "acceptable_docs_only_drift";
  }
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
  const prodWorkerCommit = String(health.worker_commit ?? "unknown");
  const head = repoHead();
  const changed = changedPathsSinceProdCommit(prodFrontendCommit);
  const docsOnly = isDocsOnlyDrift(changed);
  const alignmentStatus = resolveAlignmentStatus(
    prodFrontendCommit,
    head,
    changed,
    prodApiCommit,
    prodWorkerCommit,
  );
  const baseInterpretation = String(
    health.commit_interpretation ??
      "Compare scaffold HEAD, Vercel frontend_commit, Railway api_commit, and worker_commit.",
  );
  let commitInterpretation = baseInterpretation;
  if (alignmentStatus === "acceptable_docs_only_drift") {
    commitInterpretation = `${baseInterpretation} Acceptable docs-only drift between prod frontend_commit and repo HEAD.`;
  } else if (alignmentStatus === "failed_alignment") {
    commitInterpretation = `${baseInterpretation} Failed alignment — require repo_head=frontend=api=worker exact match.`;
  }
  return {
    prod_frontend_commit: prodFrontendCommit,
    prod_api_commit: prodApiCommit,
    prod_worker_commit: prodWorkerCommit,
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
      `Prod smoke commit gate: failed alignment (fe=${gate.prod_frontend_commit} api=${gate.prod_api_commit} worker=${gate.prod_worker_commit} head=${gate.repo_head})`,
    );
  }
}

/** Emit gate fields for operator logs (stdout). */
export async function logProdSmokeCommitGate(base = PROD_BASE): Promise<ProdSmokeCommitGate> {
  const gate = await evaluateProdSmokeCommitGate(base);
  console.log(formatProdSmokeCommitGate(gate));
  return gate;
}
