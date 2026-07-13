/**
 * Controlled merge orchestrator — dry-run plan generation for PRs #448–#455.
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
  451: "e7a568ac",
  452: "753ecf70",
  453: "934a48a7",
  454: "26f9da96",
  455: "e36df2cb",
};

export const MERGE_ORDER = [449, 450, 448] as const;
export const EXTENDED_MERGE_ORDER = [449, 450, 448, 451, 452, 453, 454, 455] as const;
export const HARDENING_PRS = [456, 457, 458, 459, 460] as const;

export const DB_HEAD_TARGETS: Record<number, string> = {
  448: "073_candidate_referrals",
  452: "074_recruiter_notification_preferences_c3",
  453: "075_recruiter_saved_views_c4",
  454: "076_recruiter_activity_timeline_c5",
  455: "077_candidate_activity_timeline",
};

/** Directed acyclic graph for stacked PR merge order. */
export function buildMergeDag(extended = false): MergeDag {
  if (!extended) {
    return {
      nodes: [...MERGE_ORDER],
      edges: [
        { from: 449, to: 450 },
        { from: 450, to: 448 },
      ],
    };
  }
  const nodes = [...EXTENDED_MERGE_ORDER];
  const edges: Array<{ from: number; to: number }> = [
    { from: 449, to: 450 },
    { from: 450, to: 448 },
    { from: 448, to: 451 },
    { from: 451, to: 452 },
    { from: 452, to: 453 },
    { from: 453, to: 454 },
    { from: 454, to: 455 },
  ];
  return { nodes, edges };
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

function depsForPr(num: number, order: readonly number[]): number[] {
  const idx = order.indexOf(num);
  if (idx <= 0) return [];
  return [order[idx - 1]!];
}

function evaluatePrStep(
  num: number,
  pr: PrState | undefined,
  deps: number[],
  opts: { requireSmoke: boolean; firstInOrder: boolean },
): { step: MergePlanStep; blockers: string[] } {
  const blockers: string[] = [];
  if (!pr) {
    blockers.push(`PR #${num} not found`);
    return { step: { pr: num, action: "blocked", reason: "PR not found", dependsOn: deps }, blockers };
  }
  if (pr.state !== "OPEN") {
    if (pr.state !== "MERGED") blockers.push(`PR #${num} not OPEN`);
    return { step: { pr: num, action: "blocked", reason: `state=${pr.state}`, dependsOn: deps }, blockers };
  }
  if (!pr.ciGreen) {
    blockers.push(`PR #${num} CI not green`);
    return { step: { pr: num, action: "blocked", reason: "CI not green", dependsOn: deps }, blockers };
  }
  if (!pr.mergeable) {
    blockers.push(`PR #${num} not mergeable`);
    return { step: { pr: num, action: "blocked", reason: "not mergeable", dependsOn: deps }, blockers };
  }
  if (opts.requireSmoke && !pr.smokePassDoc) {
    blockers.push(`PR #${num} missing founder smoke PASS evidence`);
    return { step: { pr: num, action: "blocked", reason: "no smoke PASS", dependsOn: deps }, blockers };
  }
  const action = opts.firstInOrder ? "merge" : "rebase_then_merge";
  const dbHead = DB_HEAD_TARGETS[num];
  const reason = dbHead
    ? `${action === "merge" ? "merge" : "rebase"} → Alembic ${dbHead}`
    : action === "merge"
      ? "first in sequence"
      : `rebase onto merged #${deps[deps.length - 1]}`;
  return { step: { pr: num, action, reason, dependsOn: deps }, blockers };
}

export function buildMergePlan(
  prs: PrState[],
  opts?: { scaffoldAligned?: boolean; extended?: boolean },
): MergePlan {
  const blockers: string[] = [];
  const drift = detectHeadDrift(prs);
  if (drift.length > 0) blockers.push(...drift.map((d) => `drift: ${d}`));
  if (opts?.scaffoldAligned === false) {
    blockers.push("scaffold drift — re-sync before merge");
  }

  const order = opts?.extended ? EXTENDED_MERGE_ORDER : MERGE_ORDER;
  const byNum = new Map(prs.map((p) => [p.number, p]));
  const steps: MergePlanStep[] = [];

  for (const num of order) {
    const deps = num === 449 ? [] : num === 450 ? [449] : num === 448 ? [449, 450] : depsForPr(num, order);
    const requireSmoke = num <= 450;
    const { step, blockers: stepBlockers } = evaluatePrStep(num, byNum.get(num), deps, {
      requireSmoke,
      firstInOrder: num === 449,
    });
    blockers.push(...stepBlockers);
    steps.push(step);
  }

  return {
    steps: bindShaToSteps(steps, prs),
    blocked: blockers.length > 0,
    blockers,
    driftDetected: drift.length > 0,
    dag: buildMergeDag(!!opts?.extended),
  };
}

export function formatRollbackPlan(): string {
  return [
    "Rollback plan (founder manual):",
    "  1. STOP — do not alembic downgrade on prod",
    "  2. Vercel: instant rollback to prior FE deployment",
    "  3. Railway: restore from backup if migration corrupted data",
    "  4. Re-open PR if bad merge; re-run sim:integration-070-077",
    "  5. Record incident in docs/incidents/",
  ].join("\n");
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

export function formatMergePlan(plan: MergePlan, orderLabel?: string): string {
  const lines = ["Merge plan (dry-run only):", ""];
  for (const s of plan.steps) {
    const sha = s.requiredSha ? ` @ ${s.requiredSha}` : "";
    lines.push(`  #${s.pr}: ${s.action} — ${s.reason}${sha}`);
    if (s.dependsOn.length) lines.push(`    depends: ${s.dependsOn.map((d) => `#${d}`).join(", ")}`);
  }
  lines.push("");
  if (plan.blocked) {
    lines.push("BLOCKED:");
    for (const b of plan.blockers) lines.push(`  - ${b}`);
  } else {
    lines.push(`All gates pass — founder may merge manually in order ${orderLabel ?? "449→450→448"}`);
  }
  lines.push("");
  lines.push(formatRollbackPlan());
  lines.push("");
  lines.push("Execute: NEVER — use GitHub UI after smoke evidence recorded");
  return lines.join("\n");
}
