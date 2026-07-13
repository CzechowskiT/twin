/**
 * Integration simulator core — merge order validation and report types.
 * Git operations live in integration-simulator.ts CLI.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildChain,
  findDuplicateRevisions,
  findHeads,
  findOrphans,
  findDestructiveOps,
  validateChainSegment,
  waveStackWith073Fixture,
  waveStack077Fixture,
  WAVE_070_077_CHAIN,
  type MigrationMeta,
} from "./alembic-migration-graph";

export const SCAFFOLD_REF = "c2a08b025ca950b341540f0bc80f710825c778ce";
export const PR_BRANCHES = {
  449: "feat/all-modules-green-wave-c1-recruiter-activation",
  450: "feat/all-modules-green-wave-c2-talent-pool-trust-review",
  448: "feat/all-modules-green-wave-b3-candidate-referrals",
  451: "chore/extended-integration-batch-2026-07-13",
  452: "feat/all-modules-green-wave-c3-notification-prefs",
  453: "feat/all-modules-green-wave-c4-saved-views",
  454: "feat/all-modules-green-wave-c5-activity-timeline",
  455: "feat/all-modules-green-wave-candidate-activity-timeline",
} as const;

export const MERGE_SEQUENCE = [449, 450, 448] as const;
export const EXTENDED_MERGE_SEQUENCE = [449, 450, 448, 451, 452, 453, 454, 455] as const;
export const TEMP_BRANCH = "tmp/integration-pr448-449-450-verify";
export const EXTENDED_TEMP_BRANCH = "tmp/integration-070-077-verify";

const DEFAULT_MANIFEST_PATH = "releases/integration-sim-manifest.json";

/** Load PR merge order from manifest when present; fallback to MERGE_SEQUENCE. */
export function loadManifestPrList(manifestPath?: string): number[] {
  try {
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    const raw = readFileSync(join(repoRoot, manifestPath ?? DEFAULT_MANIFEST_PATH), "utf8");
    const parsed = JSON.parse(raw) as { mergeSequence?: number[] };
    if (Array.isArray(parsed.mergeSequence) && parsed.mergeSequence.length > 0) {
      return parsed.mergeSequence;
    }
  } catch {
    /* manifest optional */
  }
  return [...MERGE_SEQUENCE];
}

export type ConflictReport = {
  pr: number;
  files: string[];
  resolved: boolean;
};

export type MigrationReport = {
  ok: boolean;
  chain: string[];
  head: string | null;
  duplicates: string[];
  orphans: string[];
  destructive: string[];
  reason?: string;
};

export type SimulatorReport = {
  schemaVersion: "1";
  startedAt: string;
  scaffoldSha: string;
  mergeSequence: number[];
  conflicts: ConflictReport[];
  migration: MigrationReport;
  testsRun: string[];
  testsPassed: boolean;
  cleanup: boolean;
  exitCode: number;
};

export function validatePostMergeMigrations(migrations: MigrationMeta[]): MigrationReport {
  const expected = [
    "070_candidate_trust_center",
    "071_recruiter_workspace_activation",
    "072_recruiter_talent_pool_trust_review_c2",
    "073_candidate_referrals",
  ];
  const segment = validateChainSegment(migrations, expected);
  const duplicates = findDuplicateRevisions(migrations);
  const orphans = findOrphans(migrations);
  const destructive = findDestructiveOps(migrations);
  const heads = findHeads(migrations);
  const chain = buildChain("070_candidate_trust_center", migrations);

  if (!segment.ok) {
    return {
      ok: false,
      chain,
      head: heads[0] ?? null,
      duplicates,
      orphans,
      destructive,
      reason: segment.reason,
    };
  }
  if (duplicates.length > 0) {
    return { ok: false, chain, head: heads[0] ?? null, duplicates, orphans, destructive, reason: "duplicate revisions" };
  }
  if (heads.length !== 1 || heads[0] !== "073_candidate_referrals") {
    return {
      ok: false,
      chain,
      head: heads[0] ?? null,
      duplicates,
      orphans,
      destructive,
      reason: `expected single head 073, got ${heads.join(", ")}`,
    };
  }
  return { ok: true, chain, head: heads[0], duplicates, orphans, destructive };
}

export function validateExtended070077Migrations(migrations: MigrationMeta[]): MigrationReport {
  const expected = [...WAVE_070_077_CHAIN];
  const segment = validateChainSegment(migrations, expected);
  const duplicates = findDuplicateRevisions(migrations);
  const orphans = findOrphans(migrations);
  const destructive = findDestructiveOps(migrations);
  const heads = findHeads(migrations);
  const chain = buildChain("070_candidate_trust_center", migrations);

  if (!segment.ok) {
    return {
      ok: false,
      chain,
      head: heads[0] ?? null,
      duplicates,
      orphans,
      destructive,
      reason: segment.reason,
    };
  }
  if (duplicates.length > 0) {
    return { ok: false, chain, head: heads[0] ?? null, duplicates, orphans, destructive, reason: "duplicate revisions" };
  }
  if (heads.length !== 1 || heads[0] !== "077_candidate_activity_timeline") {
    return {
      ok: false,
      chain,
      head: heads[0] ?? null,
      duplicates,
      orphans,
      destructive,
      reason: `expected single head 077, got ${heads.join(", ")}`,
    };
  }
  return { ok: true, chain, head: heads[0], duplicates, orphans, destructive };
}

export function validateFixtureExtended070077(): MigrationReport {
  return validateExtended070077Migrations(waveStack077Fixture());
}

export function validateFixturePostMerge(): MigrationReport {
  return validatePostMergeMigrations(waveStackWith073Fixture());
}

export function formatSimulatorMarkdown(report: SimulatorReport): string {
  const lines = [
    `# Integration simulation report`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Started | ${report.startedAt} |`,
    `| Scaffold | \`${report.scaffoldSha.slice(0, 7)}\` |`,
    `| Exit code | ${report.exitCode} |`,
    `| Migration | ${report.migration.ok ? "PASS" : "FAIL"} |`,
    `| Tests | ${report.testsPassed ? "PASS" : "FAIL/SKIP"} |`,
    `| Cleanup | ${report.cleanup ? "YES" : "NO"} |`,
    ``,
    `## Migration chain`,
    ``,
    report.migration.chain.map((r) => `- ${r}`).join("\n"),
    ``,
  ];
  if (report.conflicts.length > 0) {
    lines.push(`## Conflicts`, ``);
    for (const c of report.conflicts) {
      lines.push(`- PR #${c.pr}: ${c.files.length} files (${c.resolved ? "resolved" : "unresolved"})`);
    }
    lines.push(``);
  }
  if (!report.migration.ok && report.migration.reason) {
    lines.push(`**Migration failure:** ${report.migration.reason}`, ``);
  }
  return lines.join("\n");
}
