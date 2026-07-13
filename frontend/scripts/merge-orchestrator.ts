#!/usr/bin/env npx tsx
/**
 * Controlled merge orchestrator — dry-run only. --execute is always blocked.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExecuteBlocked,
  buildMergePlan,
  formatMergePlan,
  type PrState,
} from "./lib/merge-orchestrator-core";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function ghPrJson(num: number): { headRefOid: string; state: string; mergeable: string; headRefName: string } {
  const raw = execSync(`gh pr view ${num} --json headRefOid,state,mergeable,headRefName`, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return JSON.parse(raw);
}

function smokePassForPr(num: number): boolean {
  const docs: Record<number, string> = {
    449: "docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md",
    450: "docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md",
    448: "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md",
  };
  try {
    const doc = readFileSync(join(repoRoot, docs[num]), "utf8");
    return /FOUNDER_SMOKE:\s*PASS/i.test(doc);
  } catch {
    return false;
  }
}

function loadPrStates(): PrState[] {
  const nums = [449, 450, 448];
  return nums.map((num) => {
    const pr = ghPrJson(num);
    let checks: { conclusion: string }[] = [];
    try {
      const raw = execSync(`gh pr view ${num} --json statusCheckRollup`, {
        cwd: repoRoot,
        encoding: "utf8",
      });
      checks = JSON.parse(raw).statusCheckRollup ?? [];
    } catch {
      /* offline */
    }
    const ciGreen = checks.every(
      (c) => c.conclusion === "SUCCESS" || c.conclusion === "SKIPPED" || !c.conclusion,
    );
    return {
      number: num,
      headSha: pr.headRefOid,
      state: pr.state as PrState["state"],
      mergeable: pr.mergeable === "MERGEABLE",
      ciGreen: checks.length === 0 ? true : ciGreen,
      smokePassDoc: smokePassForPr(num),
      branch: pr.headRefName,
    };
  });
}

function main(): void {
  const execute = process.argv.includes("--execute");
  const executeBlock = assertExecuteBlocked(execute);
  if (executeBlock.length > 0) {
    console.error(executeBlock.map((i) => i.message).join("\n"));
    process.exit(4);
  }

  let prs: PrState[];
  try {
    prs = loadPrStates();
  } catch (err) {
    console.error(`Cannot load PR states (gh required): ${err}`);
    process.exit(3);
  }

  const plan = buildMergePlan(prs, { scaffoldAligned: true });
  console.log(formatMergePlan(plan));
  process.exit(plan.blocked ? 1 : 0);
}

main();
