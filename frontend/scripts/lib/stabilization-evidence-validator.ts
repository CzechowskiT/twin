/** Validate stabilization soak evidence artifacts — duration, snapshots, identities, no secrets. */
import { readFileSync } from "node:fs";

import {
  STABILIZATION_MIN_DURATION_SEC,
  STABILIZATION_SNAPSHOT_COUNT,
  type StabilizationEvidence,
} from "./stabilization-evidence-types";
import { assertNoSecretsLeaked, collectSecretValuesFromEnv } from "./stabilization-secret-redaction";

export type EvidenceValidationIssue = { path: string; message: string };

export function parseStabilizationEvidence(raw: string): StabilizationEvidence | null {
  try {
    return JSON.parse(raw) as StabilizationEvidence;
  } catch {
    return null;
  }
}

export function validateStabilizationEvidence(
  evidence: StabilizationEvidence,
  opts?: { strictDuration?: boolean; secretValues?: string[] },
): EvidenceValidationIssue[] {
  const issues: EvidenceValidationIssue[] = [];
  const strictDuration = opts?.strictDuration ?? true;

  if (evidence.schemaVersion !== "1") {
    issues.push({ path: "schemaVersion", message: "must be 1" });
  }
  if (!evidence.runId) {
    issues.push({ path: "runId", message: "runId required" });
  }
  if (strictDuration && evidence.durationSec < STABILIZATION_MIN_DURATION_SEC) {
    issues.push({
      path: "durationSec",
      message: `${evidence.durationSec}s < ${STABILIZATION_MIN_DURATION_SEC}s minimum`,
    });
  }
  if (evidence.snapshotCount !== STABILIZATION_SNAPSHOT_COUNT) {
    issues.push({
      path: "snapshotCount",
      message: `${evidence.snapshotCount} !== ${STABILIZATION_SNAPSHOT_COUNT}`,
    });
  }
  if (evidence.snapshots.length !== STABILIZATION_SNAPSHOT_COUNT) {
    issues.push({
      path: "snapshots.length",
      message: `${evidence.snapshots.length} !== ${STABILIZATION_SNAPSHOT_COUNT}`,
    });
  }
  if (!evidence.pinnedIdentities?.frontendCommit || evidence.pinnedIdentities.frontendCommit === "unknown") {
    issues.push({ path: "pinnedIdentities.frontendCommit", message: "missing frontend commit pin" });
  }
  if (!evidence.pinnedIdentities?.apiCommit || evidence.pinnedIdentities.apiCommit === "unknown") {
    issues.push({ path: "pinnedIdentities.apiCommit", message: "missing API commit pin" });
  }
  if (evidence.pinnedIdentities?.dbOk !== true) {
    issues.push({ path: "pinnedIdentities.dbOk", message: "db_ok must be true" });
  }
  if (!evidence.pinnedIdentities?.dbHead?.startsWith("077")) {
    issues.push({ path: "pinnedIdentities.dbHead", message: "db_head must be 077 chain" });
  }
  if (evidence.identityDriftDetected) {
    issues.push({ path: "identityDriftDetected", message: "identity drift invalidates soak" });
  }
  if (evidence.verdict !== "PASS") {
    issues.push({ path: "verdict", message: `expected PASS, got ${evidence.verdict}` });
  }
  for (const s of evidence.snapshots) {
    if (!s.label.match(/^T\+\d+$/)) {
      issues.push({ path: `snapshots[${s.index}].label`, message: `invalid label ${s.label}` });
    }
    if (!s.snapshotOk) {
      issues.push({ path: `snapshots[${s.index}]`, message: "snapshot not ok" });
    }
  }

  const secretValues = opts?.secretValues ?? collectSecretValuesFromEnv();
  const leaks = assertNoSecretsLeaked(JSON.stringify(evidence), secretValues);
  for (const leak of leaks) {
    issues.push({ path: "secrets", message: leak });
  }
  return issues;
}

export function validateStabilizationEvidenceFile(
  path: string,
  opts?: { strictDuration?: boolean },
): EvidenceValidationIssue[] {
  const raw = readFileSync(path, "utf8");
  const parsed = parseStabilizationEvidence(raw);
  if (!parsed) return [{ path: "file", message: "invalid JSON" }];
  const fileLeaks = assertNoSecretsLeaked(raw);
  if (fileLeaks.length) return [{ path: "file", message: fileLeaks.join("; ") }];
  return validateStabilizationEvidence(parsed, opts);
}
