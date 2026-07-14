/** Stabilization soak evidence schema — 60min / 13-snapshot prod soak. */

export type RouteCheckResult = {
  route: string;
  layer: "public" | "candidate" | "recruiter";
  status: number | "ERROR" | "SKIP";
  ok: boolean;
  ms: number;
  error?: string;
  classification?: "hard" | "transient" | "skipped";
};

export type PinnedIdentities = {
  frontendCommit: string;
  apiCommit: string;
  dbOk: boolean;
  dbHead: string;
  vercelDeploymentId: string | null;
  railwayEdge: string | null;
};

export type StabilizationSnapshot = {
  index: number;
  label: string;
  capturedUtc: string;
  elapsedSec: number;
  identities: PinnedIdentities;
  identityDrift: boolean;
  publicRoutes: RouteCheckResult[];
  candidateRoutes: RouteCheckResult[];
  recruiterRoutes: RouteCheckResult[];
  snapshotOk: boolean;
};

export type StabilizationEvidence = {
  schemaVersion: "1";
  runId: string;
  githubRunId?: string;
  startedUtc: string;
  finishedUtc: string;
  durationSec: number;
  intervalMin: number;
  snapshotCount: number;
  pinnedIdentities: PinnedIdentities;
  identityDriftDetected: boolean;
  credentialsSet: boolean;
  snapshots: StabilizationSnapshot[];
  verdict: "PASS" | "FAIL" | "PARTIAL";
  failReasons: string[];
  transientNotes: string[];
  passThresholds: {
    minDurationSec: number;
    requiredSnapshots: number;
    publicPassRate: number;
    authenticatedPassRate: number;
    maxIdentityDrift: number;
  };
};

export const STABILIZATION_SNAPSHOT_COUNT = 13;
export const STABILIZATION_INTERVAL_MIN = 5;
export const STABILIZATION_MIN_DURATION_SEC = 3600;
