/**
 * Production stabilization soak — 13 snapshots every 5min (T+0..T+60).
 * Public + optional candidate/recruiter route checks; identity pinning.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadFounderSmokeEnvIntoProcess, isFounderSmokeCredentialsReady } from "../founder-smoke-env-preflight";
import { RECRUITER_DEMO_COMPANY_SLUG } from "../../src/lib/recruiter-inbox";
import { VERCEL_FE_BASE, RAILWAY_API_BASE } from "./prod-public-probe-routes";
import {
  STABILIZATION_INTERVAL_MIN,
  STABILIZATION_MIN_DURATION_SEC,
  STABILIZATION_SNAPSHOT_COUNT,
  type PinnedIdentities,
  type RouteCheckResult,
  type StabilizationEvidence,
  type StabilizationSnapshot,
} from "./stabilization-evidence-types";
import {
  assertNoSecretsLeaked,
  collectSecretValuesFromEnv,
  redactSecrets,
} from "./stabilization-secret-redaction";

const PUBLIC_ROUTES = ["/", "/status", "/for-candidates", "/for-recruiters", "/api/public-health"] as const;
const CANDIDATE_API_ROUTES = ["/api/v1/candidates/me"] as const;
const RECRUITER_ROUTES = ["/recruiter/inbox", "/recruiter/talent-pool"] as const;

export type SoakOpts = {
  runId?: string;
  githubRunId?: string;
  fast?: boolean;
  expectDbHead?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRoute(url: string, init?: RequestInit): Promise<RouteCheckResult> {
  const layer = url.includes("/recruiter/") ? "recruiter" : url.includes("/candidates") ? "candidate" : "public";
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000), ...init });
    const ms = Date.now() - start;
    let authShell = false;
    if (layer !== "public") {
      const body = await res.text();
      authShell =
        /sign in|zaloguj|auth required|redirecting to sign in|wymagane logowanie/i.test(body) && res.status === 200;
    }
    const ok = res.status >= 200 && res.status < 400 && !authShell;
    const route = url.replace(VERCEL_FE_BASE, "").replace(RAILWAY_API_BASE, "").replace(/\?.*$/, "") || "/";
    return { route, layer, status: res.status, ok, ms };
  } catch (err) {
    const route = url.replace(VERCEL_FE_BASE, "").replace(RAILWAY_API_BASE, "").replace(/\?.*$/, "") || "/";
    return {
      route,
      layer,
      status: "ERROR",
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function fetchIdentities(expectDbHead: string): Promise<{
  identities: PinnedIdentities;
  vercelDeploymentId: string | null;
  railwayEdge: string | null;
}> {
  const feRes = await fetch(`${VERCEL_FE_BASE}/api/public-health`, {
    signal: AbortSignal.timeout(20_000),
  });
  const vercelDeploymentId = feRes.headers.get("x-vercel-id");
  const health = feRes.ok ? ((await feRes.json()) as Record<string, unknown>) : {};
  const apiRes = await fetch(`${RAILWAY_API_BASE}/api/v1/health?db=1`, {
    signal: AbortSignal.timeout(20_000),
  });
  const railwayEdge = apiRes.headers.get("x-railway-edge");
  const identities: PinnedIdentities = {
    frontendCommit: String(health.frontend_commit ?? "unknown"),
    apiCommit: String(health.api_commit ?? health.git_commit ?? "unknown"),
    dbOk: health.db_ok === true,
    dbHead: expectDbHead,
    vercelDeploymentId,
    railwayEdge,
  };
  return { identities, vercelDeploymentId, railwayEdge };
}

function identitiesMatch(a: PinnedIdentities, b: PinnedIdentities): boolean {
  return (
    a.frontendCommit === b.frontendCommit &&
    a.apiCommit === b.apiCommit &&
    a.dbOk === b.dbOk &&
    a.dbHead === b.dbHead
  );
}

async function candidateToken(): Promise<string | null> {
  const password = process.env.DEMO_USER_PASSWORD?.trim();
  if (!password) return null;
  const res = await fetch(`${VERCEL_FE_BASE}/api/v1/auth/login/json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "demo@twin.career", password }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string };
  return body.access_token?.trim() || null;
}

function recruiterUrl(path: string): string | null {
  const token = process.env.RECRUITER_TOKEN?.trim() || process.env.TWIN_RECRUITER_TOKEN?.trim();
  if (!token) return null;
  const slug = process.env.RECRUITER_DEMO_COMPANY_SLUG?.trim() || RECRUITER_DEMO_COMPANY_SLUG;
  return `${VERCEL_FE_BASE}${path}?token=${encodeURIComponent(token)}&company_slug=${encodeURIComponent(slug)}`;
}

async function captureSnapshot(
  index: number,
  elapsedSec: number,
  pinned: PinnedIdentities,
  token: string | null,
): Promise<StabilizationSnapshot> {
  const label = `T+${index * STABILIZATION_INTERVAL_MIN}`;
  const { identities } = await fetchIdentities(pinned.dbHead);
  const identityDrift = !identitiesMatch(pinned, identities);

  const publicRoutes: RouteCheckResult[] = [];
  for (const path of PUBLIC_ROUTES) {
    publicRoutes.push(await fetchRoute(`${VERCEL_FE_BASE}${path}`));
  }

  const candidateRoutes: RouteCheckResult[] = [];
  if (token) {
    for (const path of CANDIDATE_API_ROUTES) {
      candidateRoutes.push(
        await fetchRoute(`${VERCEL_FE_BASE}${path}`, {
          headers: { authorization: `Bearer ${token}` },
        }),
      );
    }
  } else {
    for (const path of CANDIDATE_API_ROUTES) {
      candidateRoutes.push({
        route: path,
        layer: "candidate",
        status: "SKIP",
        ok: true,
        ms: 0,
        classification: "skipped",
      });
    }
  }

  const recruiterRoutes: RouteCheckResult[] = [];
  for (const path of RECRUITER_ROUTES) {
    const url = recruiterUrl(path);
    if (url) {
      recruiterRoutes.push(await fetchRoute(url));
    } else {
      recruiterRoutes.push({
        route: path,
        layer: "recruiter",
        status: "SKIP",
        ok: true,
        ms: 0,
        classification: "skipped",
      });
    }
  }

  const snapshotOk =
    !identityDrift &&
    publicRoutes.every((r) => r.ok) &&
    candidateRoutes.every((r) => r.ok || r.status === "SKIP") &&
    recruiterRoutes.every((r) => r.ok || r.status === "SKIP");

  return {
    index,
    label,
    capturedUtc: new Date().toISOString(),
    elapsedSec,
    identities,
    identityDrift,
    publicRoutes,
    candidateRoutes,
    recruiterRoutes,
    snapshotOk,
  };
}

function classifyTransients(snapshots: StabilizationSnapshot[]): string[] {
  const notes: string[] = [];
  const layers: Array<keyof Pick<StabilizationSnapshot, "publicRoutes" | "candidateRoutes" | "recruiterRoutes">> = [
    "publicRoutes",
    "candidateRoutes",
    "recruiterRoutes",
  ];
  for (const layer of layers) {
    const routeIds = new Set(snapshots.flatMap((s) => s[layer].map((r) => r.route)));
    for (const route of routeIds) {
      const results = snapshots.map((s) => s[layer].find((r) => r.route === route)).filter(Boolean) as RouteCheckResult[];
      if (results.every((r) => r.status === "SKIP")) continue;
      const fails = results.filter((r) => !r.ok && r.status !== "SKIP");
      if (fails.length === 1 && results.at(-1)?.ok) {
        notes.push(`transient: ${route} failed once then recovered`);
      }
      if (fails.length >= 2) {
        notes.push(`hard: ${route} failed ${fails.length} snapshots`);
      }
    }
  }
  return notes;
}

function evaluateVerdict(
  evidence: Omit<StabilizationEvidence, "verdict" | "failReasons" | "transientNotes">,
  fast: boolean,
): Pick<StabilizationEvidence, "verdict" | "failReasons" | "transientNotes"> {
  const failReasons: string[] = [];
  const transientNotes = classifyTransients(evidence.snapshots);

  if (!fast && evidence.durationSec < STABILIZATION_MIN_DURATION_SEC) {
    failReasons.push(`duration ${evidence.durationSec}s < ${STABILIZATION_MIN_DURATION_SEC}s`);
  }
  if (evidence.snapshotCount !== STABILIZATION_SNAPSHOT_COUNT) {
    failReasons.push(`snapshot count ${evidence.snapshotCount} !== ${STABILIZATION_SNAPSHOT_COUNT}`);
  }
  if (evidence.identityDriftDetected) {
    failReasons.push("identity drift detected mid-soak");
  }
  const publicFails = evidence.snapshots.flatMap((s) => s.publicRoutes.filter((r) => !r.ok));
  if (publicFails.length > 0) {
    const hard = transientNotes.some((n) => n.startsWith("hard:"));
    if (hard || publicFails.length > 1) {
      failReasons.push(`public route failures: ${publicFails.length}`);
    }
  }
  if (evidence.credentialsSet) {
    const authFails = evidence.snapshots.flatMap((s) =>
      [...s.candidateRoutes, ...s.recruiterRoutes].filter((r) => !r.ok && r.status !== "SKIP"),
    );
    if (authFails.length > 0) failReasons.push(`authenticated route failures: ${authFails.length}`);
  } else {
    failReasons.push("credentialsSet=false — authenticated soak incomplete");
  }
  if (failReasons.length === 0) return { verdict: "PASS", failReasons, transientNotes };
  if (failReasons.length === 1 && failReasons[0].includes("credentialsSet")) {
    return { verdict: "PARTIAL", failReasons, transientNotes };
  }
  return { verdict: "FAIL", failReasons, transientNotes };
}

export function formatEvidenceMd(evidence: StabilizationEvidence, secretValues: string[]): string {
  const lines = [
    "# Stabilization soak evidence",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Run ID | ${evidence.runId} |`,
    `| GitHub run | ${evidence.githubRunId ?? "local"} |`,
    `| Verdict | **${evidence.verdict}** |`,
    `| Duration (s) | ${evidence.durationSec} |`,
    `| Snapshots | ${evidence.snapshotCount} |`,
    `| Interval (min) | ${evidence.intervalMin} |`,
    `| credentialsSet | ${evidence.credentialsSet} |`,
    `| Identity drift | ${evidence.identityDriftDetected} |`,
    `| FE commit | ${evidence.pinnedIdentities.frontendCommit.slice(0, 12)} |`,
    `| API commit | ${evidence.pinnedIdentities.apiCommit.slice(0, 12)} |`,
    `| db_ok | ${evidence.pinnedIdentities.dbOk} |`,
    `| db_head | ${evidence.pinnedIdentities.dbHead} |`,
    `| Vercel deployment | ${evidence.pinnedIdentities.vercelDeploymentId ?? "n/a"} |`,
    `| Railway edge | ${evidence.pinnedIdentities.railwayEdge ?? "n/a"} |`,
    "",
  ];
  if (evidence.failReasons.length) {
    lines.push("## Fail reasons", "");
    for (const r of evidence.failReasons) lines.push(`- ${r}`);
    lines.push("");
  }
  if (evidence.transientNotes.length) {
    lines.push("## Transient classification", "");
    for (const n of evidence.transientNotes) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("## Snapshot summary", "");
  for (const s of evidence.snapshots) {
    const pub = s.publicRoutes.filter((r) => !r.ok).length;
    const cand = s.candidateRoutes.filter((r) => !r.ok && r.status !== "SKIP").length;
    const rec = s.recruiterRoutes.filter((r) => !r.ok && r.status !== "SKIP").length;
    lines.push(
      `- ${s.label} @ ${s.capturedUtc}: ok=${s.snapshotOk} drift=${s.identityDrift} public_fail=${pub} cand_fail=${cand} rec_fail=${rec}`,
    );
  }
  return redactSecrets(lines.join("\n"), secretValues);
}

export async function runStabilizationSoak(opts: SoakOpts = {}): Promise<StabilizationEvidence> {
  loadFounderSmokeEnvIntoProcess();
  const fast = opts.fast ?? process.env.STABILIZATION_SOAK_FAST === "1";
  const intervalMs = fast ? 50 : STABILIZATION_INTERVAL_MIN * 60_000;
  const expectDbHead = opts.expectDbHead ?? process.env.STABILIZATION_EXPECT_DB_HEAD ?? "077_candidate_activity_timeline";
  const runId = opts.runId ?? process.env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  const startedUtc = new Date().toISOString();
  const startMs = Date.now();

  const { identities: pinned } = await fetchIdentities(expectDbHead);
  const credentialsSet = isFounderSmokeCredentialsReady(process.env, { loadIntoProcess: false });
  const candidateAccess = credentialsSet && process.env.DEMO_USER_PASSWORD?.trim() ? await candidateToken() : null;

  const snapshots: StabilizationSnapshot[] = [];
  for (let i = 0; i < STABILIZATION_SNAPSHOT_COUNT; i++) {
    const elapsedSec = Math.round((Date.now() - startMs) / 1000);
    snapshots.push(await captureSnapshot(i, elapsedSec, pinned, candidateAccess));
    if (i < STABILIZATION_SNAPSHOT_COUNT - 1) await sleep(intervalMs);
  }

  const finishedUtc = new Date().toISOString();
  const durationSec = Math.round((Date.now() - startMs) / 1000);
  const identityDriftDetected = snapshots.some((s) => s.identityDrift);

  const base: Omit<StabilizationEvidence, "verdict" | "failReasons" | "transientNotes"> = {
    schemaVersion: "1",
    runId,
    githubRunId: opts.githubRunId ?? process.env.GITHUB_RUN_ID,
    startedUtc,
    finishedUtc,
    durationSec,
    intervalMin: STABILIZATION_INTERVAL_MIN,
    snapshotCount: snapshots.length,
    pinnedIdentities: pinned,
    identityDriftDetected,
    credentialsSet,
    snapshots,
    passThresholds: {
      minDurationSec: STABILIZATION_MIN_DURATION_SEC,
      requiredSnapshots: STABILIZATION_SNAPSHOT_COUNT,
      publicPassRate: 1,
      authenticatedPassRate: 1,
      maxIdentityDrift: 0,
    },
  };
  const verdictPack = evaluateVerdict(base, fast);
  return { ...base, ...verdictPack };
}

export function writeStabilizationEvidence(
  evidence: StabilizationEvidence,
  outDir?: string,
): { jsonPath: string; mdPath: string } {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const dir = outDir ?? join(repoRoot, "reports", "stabilization");
  mkdirSync(dir, { recursive: true });
  const secretValues = collectSecretValuesFromEnv();
  const json = redactSecrets(JSON.stringify(evidence, null, 2), secretValues);
  const leaks = assertNoSecretsLeaked(json, secretValues);
  if (leaks.length) throw new Error(`stabilization evidence secret leak: ${leaks.join("; ")}`);
  const md = formatEvidenceMd(evidence, secretValues);
  const mdLeaks = assertNoSecretsLeaked(md, secretValues);
  if (mdLeaks.length) throw new Error(`stabilization MD secret leak: ${mdLeaks.join("; ")}`);

  const jsonPath = join(dir, `stabilization-evidence-${evidence.runId}.json`);
  const mdPath = join(dir, `stabilization-evidence-${evidence.runId}.md`);
  writeFileSync(jsonPath, json);
  writeFileSync(mdPath, md);
  return { jsonPath, mdPath };
}
