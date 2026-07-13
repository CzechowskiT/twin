#!/usr/bin/env npx tsx
/**
 * Integration simulator — scaffold → #449 → #450 → #448 on temp branch.
 * Produces JSON + MD report, validates migrations, runs targeted tests, cleans up.
 *
 * Usage: npx tsx scripts/integration-simulator.ts [--dry-run] [--keep-branch]
 * Exit: 0 success, 1 migration/test failure, 2 git conflict, 3 invalid env
 */
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXTENDED_MERGE_SEQUENCE,
  EXTENDED_TEMP_BRANCH,
  formatSimulatorMarkdown,
  loadManifestPrList,
  PR_BRANCHES,
  SCAFFOLD_REF,
  TEMP_BRANCH,
  validateExtended070077Migrations,
  validateFixtureExtended070077,
  validatePostMergeMigrations,
  type ConflictReport,
  type MigrationReport,
  type SimulatorReport,
} from "./lib/integration-simulator-core";
import {
  findDestructiveOps,
  parseMigrationSource,
  type MigrationMeta,
} from "./lib/alembic-migration-graph";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT_DIR = join(repoRoot, "reports/integration-sim");
const VERSIONS_DIR = join(repoRoot, "backend/alembic/versions");

const dryRun = process.argv.includes("--dry-run");
const keepBranch = process.argv.includes("--keep-branch");
const extended = process.argv.includes("--extended");

let interrupted = false;
let cleanupBranch: string | null = null;
let restoreBranch: string | null = null;

function git(cmd: string): string {
  return execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function cleanupOnInterrupt(): void {
  if (!interrupted || !cleanupBranch || !restoreBranch) return;
  try {
    git(`git checkout ${restoreBranch}`);
    git(`git branch -D ${cleanupBranch}`);
  } catch {
    /* best-effort */
  }
}

process.on("SIGINT", () => {
  interrupted = true;
  cleanupOnInterrupt();
  process.exit(130);
});

function loadMigrationsFromDisk(): { migrations: MigrationMeta[]; report: MigrationReport } {
  const srcByFile = new Map<string, string>();
  const migrations = readdirSync(VERSIONS_DIR)
    .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
    .map((file) => {
      const src = readFileSync(join(VERSIONS_DIR, file), "utf8");
      srcByFile.set(file, src);
      return parseMigrationSource(file, src);
    });
  const report = validatePostMergeMigrations(migrations);
  const destructive = findDestructiveOps(migrations, srcByFile);
  return { migrations, report: { ...report, destructive } };
}

function runSimulator(): SimulatorReport {
  const startedAt = new Date().toISOString();
  const conflicts: ConflictReport[] = [];
  let exitCode = 0;
  let testsPassed = false;
  let cleanup = false;
  let migrationReport = validatePostMergeMigrations([]);

  if (dryRun) {
    const { report } = loadMigrationsFromDisk();
    migrationReport = extended
      ? validateExtended070077Migrations(
          readdirSync(VERSIONS_DIR)
            .filter((f) => f.endsWith(".py") && !f.startsWith("__"))
            .map((file) => parseMigrationSource(file, readFileSync(join(VERSIONS_DIR, file), "utf8"))),
        )
      : report;
    if (!extended) {
      const has073 = migrationReport.chain.includes("073_candidate_referrals");
      if (!has073) {
        migrationReport = { ...migrationReport, ok: false, reason: "dry-run on #450 branch — 073 absent (expected until #448 merged)" };
        exitCode = 0;
      }
    } else if (!migrationReport.ok) {
      migrationReport = validateFixtureExtended070077();
      migrationReport = {
        ...migrationReport,
        reason: migrationReport.ok
          ? "fixture PASS (disk graph incomplete until full merge)"
          : migrationReport.reason,
      };
      exitCode = migrationReport.ok ? 0 : 1;
    }
    return {
      schemaVersion: "1",
      startedAt,
      scaffoldSha: SCAFFOLD_REF,
      mergeSequence: extended ? [...EXTENDED_MERGE_SEQUENCE] : loadManifestPrList(),
      conflicts,
      migration: migrationReport,
      testsRun: [extended ? "dry-run: 070-077 graph" : "dry-run: migration graph only"],
      testsPassed: migrationReport.ok,
      cleanup: true,
      exitCode,
    };
  }

  const mergeSequence = extended ? [...EXTENDED_MERGE_SEQUENCE] : loadManifestPrList();
  const tempBranch = extended ? EXTENDED_TEMP_BRANCH : TEMP_BRANCH;
  try {
    const currentBranch = git("git rev-parse --abbrev-ref HEAD");
    restoreBranch = currentBranch;
    cleanupBranch = tempBranch;
    const branches = mergeSequence.map((pr) => PR_BRANCHES[pr as keyof typeof PR_BRANCHES]).filter(Boolean);
    git(`git fetch origin ${SCAFFOLD_REF.slice(0, 7)} ${branches.join(" ")} 2>/dev/null || git fetch --all`);

    try {
      git(`git branch -D ${tempBranch} 2>/dev/null || true`);
    } catch {
      /* branch may not exist */
    }

    git(`git checkout -B ${tempBranch} ${SCAFFOLD_REF}`);

    for (const pr of mergeSequence) {
      if (interrupted) break;
      const branch = PR_BRANCHES[pr as keyof typeof PR_BRANCHES];
      if (!branch) continue;
      try {
        git(`git merge --no-edit origin/${branch}`);
        conflicts.push({ pr, files: [], resolved: true });
      } catch {
        const status = git("git diff --name-only --diff-filter=U");
        const files = status ? status.split("\n").filter(Boolean) : ["unknown"];
        conflicts.push({ pr, files, resolved: false });
        git("git merge --abort 2>/dev/null || true");
        exitCode = 2;
        break;
      }
    }

    if (exitCode === 0) {
      const { migrations, report } = loadMigrationsFromDisk();
      migrationReport = extended ? validateExtended070077Migrations(migrations) : report;
      if (!migrationReport.ok) exitCode = 1;

      const pytestTargets = extended
        ? "tests/test_recruiter_activation_persistence.py tests/test_recruiter_c2_persistence.py tests/test_recruiter_c3_notification_prefs.py tests/test_recruiter_c4_saved_views.py tests/test_recruiter_c5_activity_timeline.py -q --tb=no"
        : "tests/test_recruiter_activation_persistence.py tests/test_recruiter_c2_persistence.py -q --tb=no";
      try {
        execSync(`cd backend && python3 -m pytest ${pytestTargets}`, { cwd: repoRoot, stdio: "pipe" });
        testsPassed = true;
      } catch {
        testsPassed = false;
        if (exitCode === 0) exitCode = 1;
      }
    }

    if (!keepBranch && !interrupted) {
      git(`git checkout ${currentBranch}`);
      git(`git branch -D ${tempBranch}`);
      cleanup = true;
      cleanupBranch = null;
      restoreBranch = null;
    }
  } catch (err) {
    exitCode = 3;
    migrationReport = { ...migrationReport, ok: false, reason: String(err) };
  }

  return {
    schemaVersion: "1",
    startedAt,
    scaffoldSha: SCAFFOLD_REF,
    mergeSequence: extended ? [...EXTENDED_MERGE_SEQUENCE] : loadManifestPrList(),
    conflicts,
    migration: migrationReport,
    testsRun: dryRun
      ? []
      : extended
        ? [
            "test_recruiter_activation_persistence",
            "test_recruiter_c2_persistence",
            "test_recruiter_c3_notification_prefs",
            "test_recruiter_c4_saved_views",
            "test_recruiter_c5_activity_timeline",
          ]
        : ["test_recruiter_activation_persistence", "test_recruiter_c2_persistence"],
    testsPassed,
    cleanup,
    exitCode,
  };
}

function main(): void {
  const report = runSimulator();
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const jsonPath = join(REPORT_DIR, `integration-sim-${stamp}.json`);
  const mdPath = join(REPORT_DIR, `integration-sim-${stamp}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, formatSimulatorMarkdown(report));
  console.log(formatSimulatorMarkdown(report));
  console.log(`\nReports: ${jsonPath}`);
  process.exit(report.exitCode);
}

main();
