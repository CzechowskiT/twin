/**
 * Controlled merge orchestrator — dry-run plan generation for PRs #448–#450.
 * Never executes merges; --execute is blocked by design.
 */

import type { ValidationIssue } from "./smoke-evidence-validator";

export type PrState = {
  number: number;
  headSha: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  mergeable: boolean;
  ciGreen: boolean;
  smokePassDoc: boolean;
  branch: string;
};

export type MergePlanStep = {
  pr: number;
  action: "merge" | "rebase_then_merge" | "blocked";
  reason: string;
  dependsOn: number[];
  requiredSha?: string;
};

export type MergeDag = {
  nodes: number[];
  edges: Array<{ from: number; to: number }>;
};

export type MergePlan = {
  steps: MergePlanStep[];
  blocked: boolean;
  blockers: string[];
  driftDetected: boolean;
  dag: MergeDag;
};

export const EXPECTED_HEADS: Record<number, string> = {
  449: "905a660c",
  450: "cda7a206",
  448: "5c3c4825",
  451: "02fa2ecd",
  452: "7f9f7bab",
  453: "99e423a9",
  454: "f3bc6db7",
  455: "06e6c359",
};

export const MERGE_ORDER = [449, 450, 448] as const;
export const EXTENDED_MERGE_ORDER = [449, 450, 448, 451, 452, 453, 454, 455] as const;

/** Directed acyclic graph for stacked PR merge order. */
export function buildMergeDag(): MergeDag {
  return {
    nodes: [...MERGE_ORDER],
    edges: [
      { from: 449, to: 450 },
      { from: 450, to: 448 },
    ],
  };
}

export function validateDagAcyclic(dag: MergeDag): string[] {
  const issues: string[] = [];
  const visited = new Set<number>();
  const stack = new Set<number>();
  const adj = new Map<number, number[]>();
  for (const e of dag.edges) {
    const kids = adj.get(e.from) ?? [];
    kids.push(e.to);
    adj.set(e.from, kids);
  }
  function dfs(n: number): boolean {
    if (stack.has(n)) {
      issues.push(`cycle detected at PR #${n}`);
      return false;
    }
    if (visited.has(n)) return true;
    stack.add(n);
    for (const kid of adj.get(n) ?? []) dfs(kid);
    stack.delete(n);
    visited.add(n);
    return true;
  }
  for (const n of dag.nodes) dfs(n);
  return issues;
}

export function bindShaToSteps(steps: MergePlanStep[], prs: PrState[]): MergePlanStep[] {
  const byNum = new Map(prs.map((p) => [p.number, p]));
  return steps.map((s) => ({
    ...s,
    requiredSha: byNum.get(s.pr)?.headSha.slice(0, 12),
  }));
}

export function detectHeadDrift(prs: PrState[]): string[] {
  const drift: string[] = [];
  for (const pr of prs) {
    const expected = EXPECTED_HEADS[pr.number];
    if (expected && !pr.headSha.startsWith(expected.slice(0, 7))) {
      drift.push(`PR #${pr.number}: expected ${expected.slice(0, 7)}, got ${pr.headSha.slice(0, 7)}`);
    }
  }
  return drift;
}

export function buildMergePlan(prs: PrState[], opts?: { scaffoldAligned?: boolean }): MergePlan {
  const byNum = new Map(prs.map((p) => [p.number, p]));
  const blockers: string[] = [];
  const drift = detectHeadDrift(prs);
  if (drift.length > 0) blockers.push(...drift.map((d) => `drift: ${d}`));
  if (opts?.scaffoldAligned === false) {
    blockers.push("scaffold drift — re-sync before merge");
  }

  const steps: MergePlanStep[] = [];
  let prevMerged = true;

  for (const num of MERGE_ORDER) {
    const pr = byNum.get(num);
    if (!pr) {
      blockers.push(`PR #${num} not found`);
      steps.push({ pr: num, action: "blocked", reason: "PR not found", dependsOn: [] });
      continue;
    }
    if (pr.state !== "OPEN") {
      steps.push({ pr: num, action: "blocked", reason: `state=${pr.state}`, dependsOn: [] });
      if (pr.state !== "MERGED") blockers.push(`PR #${num} not OPEN`);
      continue;
    }
    if (!pr.ciGreen) {
      blockers.push(`PR #${num} CI not green`);
      steps.push({ pr: num, action: "blocked", reason: "CI not green", dependsOn: [] });
      continue;
    }
    const deps: number[] = num === 449 ? [] : num === 450 ? [449] : [449, 450];
    if (!pr.mergeable) {
      blockers.push(`PR #${num} not mergeable`);
      steps.push({ pr: num, action: "blocked", reason: "not mergeable", dependsOn: deps });
      continue;
    }
    if (!pr.smokePassDoc) {
      blockers.push(`PR #${num} missing founder smoke PASS evidence`);
      steps.push({ pr: num, action: "blocked", reason: "no smoke PASS", dependsOn: deps });
      continue;
    }
    if (!prevMerged && num !== 449) {
      blockers.push(`PR #${num} requires prior PR merged`);
      steps.push({ pr: num, action: "blocked", reason: "dependency not merged", dependsOn: deps });
      continue;
    }
    const action = num === 449 ? "merge" : "rebase_then_merge";
    steps.push({
      pr: num,
      action,
      reason: action === "merge" ? "C1 first in sequence" : `rebase onto merged #${deps[deps.length - 1]}`,
      dependsOn: deps,
    });
  }

  return {
    steps: bindShaToSteps(steps, prs),
    blocked: blockers.length > 0,
    blockers,
    driftDetected: drift.length > 0,
    dag: buildMergeDag(),
  };
}

export function assertExecuteBlocked(executeFlag: boolean): ValidationIssue[] {
  if (!executeFlag) return [];
  return [
    {
      path: "--execute",
      message: "merge execute is permanently blocked — founder must merge manually after smoke PASS",
    },
  ];
}

export function formatMergePlan(plan: MergePlan): string {
  const lines = ["Merge plan (dry-run only):", ""];
  for (const s of plan.steps) {
    lines.push(`  #${s.pr}: ${s.action} — ${s.reason}`);
    if (s.dependsOn.length) lines.push(`    depends: ${s.dependsOn.map((d) => `#${d}`).join(", ")}`);
  }
  lines.push("");
  if (plan.blocked) {
    lines.push("BLOCKED:");
    for (const b of plan.blockers) lines.push(`  - ${b}`);
  } else {
    lines.push("All gates pass — founder may merge manually in order 449→450→448");
  }
  lines.push("");
  lines.push("Execute: NEVER — use GitHub UI after smoke evidence recorded");
  return lines.join("\n");
}
