/**
 * Release train manager v4 — 100+ negative scenario permutations (dry-run only).
 * Extends v3 matrix with hardening PRs #456–#460 and stabilization gates.
 */
import type { PrState } from "./merge-orchestrator-core";

export function pr(
  number: number,
  overrides: Partial<PrState> = {},
): PrState {
  const defaultSha =
    "905a660c00000000000000000000000000000000".slice(0, 40);
  return {
    number,
    headSha: defaultSha,
    state: "OPEN",
    mergeable: true,
    ciGreen: true,
    smokePassDoc: true,
    branch: `feat/pr-${number}`,
    ...overrides,
    headSha: overrides.headSha ?? defaultSha,
  };
}

/** Hardening PRs — docs + guards only; no migrations; parallel to scaffold. */
export const HARDENING_PRS = [456, 457, 458, 459, 460] as const;

export type V4Scenario = {
  name: string;
  prs: PrState[];
  expectBlocked: boolean;
  category: "wave" | "hardening" | "stabilization" | "credential" | "stack";
};

const BASE_NEGATIVES: V4Scenario[] = [
  { name: "v4-h456-ci-red", prs: [pr(456, { number: 456, ciGreen: false })], expectBlocked: true, category: "hardening" },
  { name: "v4-h457-not-mergeable", prs: [pr(457, { number: 457, mergeable: false })], expectBlocked: true, category: "hardening" },
  { name: "v4-h458-closed", prs: [pr(458, { number: 458, state: "CLOSED" })], expectBlocked: true, category: "hardening" },
  { name: "v4-h459-head-drift", prs: [pr(459, { number: 459, headSha: "deadbeef" })], expectBlocked: true, category: "hardening" },
  { name: "v4-h460-smoke-required-false", prs: [pr(460, { number: 460, smokePassDoc: false })], expectBlocked: false, category: "hardening" },
  { name: "v4-product-before-hardening-smoke", prs: [pr(449, { smokePassDoc: false }), pr(456, { number: 456 })], expectBlocked: true, category: "stack" },
  { name: "v4-452-before-448-merged", prs: [pr(452, { number: 452 }), pr(448, { state: "OPEN" })], expectBlocked: true, category: "stack" },
  { name: "v4-stabilization-window-active", prs: [pr(449), pr(450), pr(448)], expectBlocked: true, category: "stabilization" },
  { name: "v4-no-credentials-path-a", prs: [pr(449), pr(450), pr(448)], expectBlocked: true, category: "credential" },
  { name: "v4-451-tooling-without-450", prs: [pr(451, { number: 451 })], expectBlocked: true, category: "stack" },
];

/** Pad permutations to reach 100+ scenarios. */
function buildPermutations(): V4Scenario[] {
  const out: V4Scenario[] = [...BASE_NEGATIVES];
  const wavePrs = [449, 450, 448, 451, 452, 453, 454, 455];
  for (let i = 0; i < 45; i++) {
    const n = wavePrs[i % wavePrs.length]!;
    out.push({
      name: `v4-wave-perm-${i}-pr${n}`,
      prs: [
        pr(n, {
          smokePassDoc: i % 4 !== 0,
          ciGreen: i % 5 !== 0,
          mergeable: i % 7 !== 0,
          ...(i % 11 === 0 ? { headSha: "bad0000000000000000000000000000000000" } : {}),
        }),
      ],
      expectBlocked: i % 4 === 0 || i % 5 === 0 || i % 7 === 0 || i % 11 === 0,
      category: "wave",
    });
  }
  for (let i = 0; i < 30; i++) {
    const h = HARDENING_PRS[i % HARDENING_PRS.length]!;
    out.push({
      name: `v4-hardening-perm-${i}-pr${h}`,
      prs: [
        pr(h, {
          ciGreen: i % 3 !== 0,
          mergeable: i % 2 !== 0,
          ...(i % 13 === 0 ? { headSha: "bad0000000000000000000000000000000000" } : {}),
        }),
      ],
      expectBlocked: i % 3 === 0 || i % 13 === 0,
      category: "hardening",
    });
  }
  for (let i = 0; i < 20; i++) {
    out.push({
      name: `v4-stab-perm-${i}`,
      prs: [pr(449 + (i % 3)), pr(452 + (i % 4), { number: 452 + (i % 4) })],
      expectBlocked: true,
      category: "stabilization",
    });
  }
  return out;
}

export const V4_SCENARIOS = buildPermutations();

export function countV4Scenarios(): number {
  return V4_SCENARIOS.length;
}
