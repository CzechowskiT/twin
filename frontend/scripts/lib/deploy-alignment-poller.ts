/**
 * Gate F deploy alignment poller — Railway + public-health state machine.
 *
 * Exit 0 only when repo_head === frontend_commit === api_commit === worker_commit
 * (exact SHA prefix match) AND Railway twin + worker deployments are SUCCESS
 * (not BUILDING/DEPLOYING). Transient deploy states are waited, not failed.
 */
import { execSync } from "node:child_process";

export type RailwayDeployStatus =
  | "SUCCESS"
  | "FAILED"
  | "CRASHED"
  | "REMOVED"
  | "SKIPPED"
  | "BUILDING"
  | "DEPLOYING"
  | "INITIALIZING"
  | "WAITING"
  | "QUEUED"
  | "UNKNOWN";

export type AlignmentPhase =
  | "waiting_railway"
  | "waiting_health"
  | "aligned"
  | "failed_permanent"
  | "timeout";

export type DeploySnapshot = {
  service: string;
  status: RailwayDeployStatus;
  commitHash: string | null;
};

export type PublicHealthCommits = {
  frontend_commit: string;
  api_commit: string;
  worker_commit: string;
};

export type AlignmentDecision = {
  phase: AlignmentPhase;
  reason: string;
  repo_head: string;
  health: PublicHealthCommits | null;
  api_deploy: DeploySnapshot | null;
  worker_deploy: DeploySnapshot | null;
};

export const TRANSIENT_RAILWAY_STATUSES: ReadonlySet<RailwayDeployStatus> = new Set([
  "BUILDING",
  "DEPLOYING",
  "INITIALIZING",
  "WAITING",
  "QUEUED",
  "UNKNOWN",
]);

export const TERMINAL_FAIL_RAILWAY_STATUSES: ReadonlySet<RailwayDeployStatus> = new Set([
  "FAILED",
  "CRASHED",
]);

export function shortSha(sha: string, n = 7): string {
  if (!sha || sha === "unknown") return "unknown";
  return sha.slice(0, n);
}

/** Exact alignment: all four SHAs share the same non-unknown prefix (full or short). */
export function shasStrictlyAligned(...shas: string[]): boolean {
  const cleaned = shas.map((s) => (s || "unknown").trim()).filter(Boolean);
  if (cleaned.length < 2) return false;
  if (cleaned.some((s) => s === "unknown")) return false;
  const ref = cleaned[0]!;
  return cleaned.every((s) => s.startsWith(shortSha(ref, 12)) || ref.startsWith(shortSha(s, 12)) || s === ref);
}

export function normalizeRailwayStatus(raw: string | null | undefined): RailwayDeployStatus {
  const s = String(raw || "UNKNOWN").trim().toUpperCase();
  const allowed: RailwayDeployStatus[] = [
    "SUCCESS",
    "FAILED",
    "CRASHED",
    "REMOVED",
    "SKIPPED",
    "BUILDING",
    "DEPLOYING",
    "INITIALIZING",
    "WAITING",
    "QUEUED",
    "UNKNOWN",
  ];
  return (allowed.includes(s as RailwayDeployStatus) ? s : "UNKNOWN") as RailwayDeployStatus;
}

/**
 * Pure state transition — used by unit tests and the CLI poller.
 * Parent SHA / "same functional code" is NEVER treated as aligned.
 */
export function decideAlignment(input: {
  repo_head: string;
  health: PublicHealthCommits | null;
  api_deploy: DeploySnapshot | null;
  worker_deploy: DeploySnapshot | null;
}): AlignmentDecision {
  const { repo_head, health, api_deploy, worker_deploy } = input;
  const base = {
    repo_head,
    health,
    api_deploy,
    worker_deploy,
  };

  if (api_deploy && TERMINAL_FAIL_RAILWAY_STATUSES.has(api_deploy.status)) {
    return { ...base, phase: "failed_permanent", reason: `api_deploy_${api_deploy.status}` };
  }
  if (worker_deploy && TERMINAL_FAIL_RAILWAY_STATUSES.has(worker_deploy.status)) {
    return { ...base, phase: "failed_permanent", reason: `worker_deploy_${worker_deploy.status}` };
  }

  if (
    (api_deploy && TRANSIENT_RAILWAY_STATUSES.has(api_deploy.status)) ||
    (worker_deploy && TRANSIENT_RAILWAY_STATUSES.has(worker_deploy.status))
  ) {
    return { ...base, phase: "waiting_railway", reason: "railway_transient" };
  }

  if (!api_deploy || api_deploy.status !== "SUCCESS") {
    return { ...base, phase: "waiting_railway", reason: "api_not_success" };
  }
  if (!worker_deploy || worker_deploy.status !== "SUCCESS") {
    return { ...base, phase: "waiting_railway", reason: "worker_not_success" };
  }

  if (!health) {
    return { ...base, phase: "waiting_health", reason: "public_health_missing" };
  }

  const { frontend_commit, api_commit, worker_commit } = health;
  if (
    !shasStrictlyAligned(repo_head, frontend_commit, api_commit, worker_commit) ||
    !shasStrictlyAligned(repo_head, api_deploy.commitHash || "unknown") ||
    !shasStrictlyAligned(repo_head, worker_deploy.commitHash || "unknown")
  ) {
    return {
      ...base,
      phase: "waiting_health",
      reason: "sha_mismatch_or_unknown",
    };
  }

  return { ...base, phase: "aligned", reason: "strict_four_way" };
}

export function parseRailwayDeploymentListJson(raw: string, service: string): DeploySnapshot | null {
  try {
    const data = JSON.parse(raw) as unknown;
    const items = Array.isArray(data) ? data : [];
    if (!items.length) return null;
    const first = items[0] as {
      status?: string;
      meta?: { commitHash?: string };
    };
    return {
      service,
      status: normalizeRailwayStatus(first.status),
      commitHash: first.meta?.commitHash ? String(first.meta.commitHash) : null,
    };
  } catch {
    return null;
  }
}

export function repoHeadFromGit(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
}

export async function fetchPublicHealthCommits(
  base = process.env.TWIN_PROD_BASE_URL ?? "https://twin-sooty.vercel.app",
): Promise<PublicHealthCommits> {
  const root = base.replace(/\/$/, "");
  const res = await fetch(`${root}/api/public-health`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`public-health HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  return {
    frontend_commit: String(json.frontend_commit ?? "unknown"),
    api_commit: String(json.api_commit ?? "unknown"),
    worker_commit: String(json.worker_commit ?? "unknown"),
  };
}

export function readRailwayDeploySnapshot(service: string): DeploySnapshot | null {
  try {
    const raw = execSync(`railway deployment list --service ${service} --json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    return parseRailwayDeploymentListJson(raw, service);
  } catch {
    return {
      service,
      status: "UNKNOWN",
      commitHash: null,
    };
  }
}

export type PollOptions = {
  apiService?: string;
  workerService?: string;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  fetchHealth?: () => Promise<PublicHealthCommits>;
  readApi?: () => DeploySnapshot | null;
  readWorker?: () => DeploySnapshot | null;
  repoHead?: string;
};

/** Exponential backoff poller — returns final decision (aligned or timeout/fail). */
export async function pollUntilStrictAlignment(opts: PollOptions = {}): Promise<AlignmentDecision> {
  const apiService = opts.apiService ?? "twin";
  const workerService = opts.workerService ?? "enthusiastic-encouragement";
  const maxAttempts = opts.maxAttempts ?? 24;
  const initialDelayMs = opts.initialDelayMs ?? 5_000;
  const maxDelayMs = opts.maxDelayMs ?? 45_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const repo_head = opts.repoHead ?? repoHeadFromGit();
  const fetchHealth = opts.fetchHealth ?? (() => fetchPublicHealthCommits());
  const readApi = opts.readApi ?? (() => readRailwayDeploySnapshot(apiService));
  const readWorker = opts.readWorker ?? (() => readRailwayDeploySnapshot(workerService));

  let delay = initialDelayMs;
  let last: AlignmentDecision = {
    phase: "waiting_railway",
    reason: "not_started",
    repo_head,
    health: null,
    api_deploy: null,
    worker_deploy: null,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const api_deploy = readApi();
    const worker_deploy = readWorker();
    let health: PublicHealthCommits | null = null;
    try {
      health = await fetchHealth();
    } catch {
      health = null;
    }
    last = decideAlignment({ repo_head, health, api_deploy, worker_deploy });
    if (last.phase === "aligned" || last.phase === "failed_permanent") {
      return last;
    }
    if (attempt < maxAttempts) {
      await sleep(delay);
      delay = Math.min(maxDelayMs, Math.floor(delay * 1.5));
    }
  }
  return { ...last, phase: "timeout", reason: last.reason || "max_attempts" };
}
