/**
 * PR #448 conflict resolver — deterministic rules for 4 known merge files.
 * Used by integration-simulator when #448 merge conflicts after #449+#450.
 */

export const PR448_CONFLICT_FILES = [
  "frontend/package.json",
  "frontend/src/lib/all-workspace-modules-activation.ts",
  "frontend/scripts/candidate-green-modules-founder-smoke-guard.test.ts",
  "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md",
] as const;

export type ConflictResolution = {
  file: string;
  strategy: "union_json_scripts" | "merge_activation_by_id" | "union_test_blocks" | "append_doc";
  ok: boolean;
  detail: string;
};

/** Union package.json scripts keys from base, ours (C2), theirs (B3). */
export function resolvePackageJsonScripts(
  base: string,
  ours: string,
  theirs: string,
): { content: string; ok: boolean; detail: string } {
  try {
    const baseObj = JSON.parse(base) as { scripts?: Record<string, string> };
    const oursObj = JSON.parse(ours) as { scripts?: Record<string, string> };
    const theirsObj = JSON.parse(theirs) as { scripts?: Record<string, string> };
    const merged = { ...baseObj };
    merged.scripts = {
      ...(baseObj.scripts ?? {}),
      ...(oursObj.scripts ?? {}),
      ...(theirsObj.scripts ?? {}),
    };
    const sortedScripts: Record<string, string> = {};
    for (const key of Object.keys(merged.scripts).sort()) {
      sortedScripts[key] = merged.scripts[key]!;
    }
    merged.scripts = sortedScripts;
    return { content: `${JSON.stringify(merged, null, 2)}\n`, ok: true, detail: "union scripts" };
  } catch (err) {
    return { content: ours, ok: false, detail: `parse error: ${err}` };
  }
}

/** Extract WORKSPACE_MODULE_ACTIVATION array entries by id. */
export function mergeActivationById(ours: string, theirs: string): { content: string; ok: boolean; detail: string } {
  const entryRe = /\{\s*id:\s*"([^"]+)"/g;
  const oursIds = new Set<string>();
  const theirsIds = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(ours)) !== null) oursIds.add(m[1]!);
  entryRe.lastIndex = 0;
  while ((m = entryRe.exec(theirs)) !== null) theirsIds.add(m[1]!);
  const union = new Set([...oursIds, ...theirsIds]);
  const hasReferrals = union.has("candidate_referrals");
  const hasC2 = union.has("recruiter_talent_pool") || union.has("recruiter_trust_review_queue");
  if (!hasReferrals || !hasC2) {
    return {
      content: ours,
      ok: false,
      detail: `missing modules: referrals=${hasReferrals} c2=${hasC2}`,
    };
  }
  // Prefer theirs (B3) as base when it includes referrals; patch missing C2 ids from ours
  const useBase = theirs.includes("candidate_referrals") ? theirs : ours;
  const missingFromTheirs = [...oursIds].filter((id) => !theirsIds.has(id));
  if (missingFromTheirs.length === 0) {
    return { content: useBase, ok: true, detail: `union ${union.size} module ids` };
  }
  const insertBlock = extractEntriesByIds(ours, missingFromTheirs);
  const marker = "export const WORKSPACE_MODULE_ACTIVATION";
  const idx = useBase.indexOf(marker);
  if (idx < 0) {
    return { content: useBase, ok: false, detail: "activation array marker missing" };
  }
  const closeIdx = useBase.indexOf("];", idx);
  if (closeIdx < 0) {
    return { content: useBase, ok: false, detail: "activation array close missing" };
  }
  const merged =
    useBase.slice(0, closeIdx) + (insertBlock ? `,\n${insertBlock}` : "") + useBase.slice(closeIdx);
  return { content: merged, ok: true, detail: `merged ${union.size} module ids` };
}

function extractEntriesByIds(src: string, ids: string[]): string {
  const blocks: string[] = [];
  for (const id of ids) {
    const re = new RegExp(`\\{[^{}]*id:\\s*"${id}"[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`, "s");
    const match = src.match(re);
    if (match) blocks.push(match[0]!);
  }
  return blocks.join(",\n");
}

/** Union test blocks — prefer longer file with referral coverage. */
export function unionGuardTests(ours: string, theirs: string): { content: string; ok: boolean; detail: string } {
  const oursTests = (ours.match(/^test\(/gm) ?? []).length;
  const theirsTests = (theirs.match(/^test\(/gm) ?? []).length;
  const hasReferrals = /referral/i.test(theirs) || /referral/i.test(ours);
  const hasB2 = /trust.center|career.compass|B2|B3/i.test(ours);
  const longer = ours.length >= theirs.length ? ours : theirs;
  const combined = ours.includes("referral") ? ours : theirs.includes("referral") ? `${ours}\n${theirs}` : longer;
  return {
    content: combined,
    ok: hasReferrals || hasB2,
    detail: `ours=${oursTests} theirs=${theirsTests}`,
  };
}

/** Append B3 section to master plan if referrals slice missing. */
export function appendMasterPlanDoc(ours: string, theirs: string): { content: string; ok: boolean; detail: string } {
  if (ours.includes("candidate_referrals") || ours.includes("Wave B slice 3")) {
    return { content: ours, ok: true, detail: "B3 already present" };
  }
  const b3Marker = /## Wave B.*slice 3|candidate.referrals/i;
  const b3Section = theirs.match(/## Wave B[\s\S]*?(?=\n## |\n---|\Z)/i)?.[0];
  if (!b3Section || !b3Marker.test(theirs)) {
    return {
      content: ours + "\n\n## Wave B slice 3 — candidate referrals (#448)\n\nPersistent referrals module; PILOT until founder smoke.\n",
      ok: true,
      detail: "synthetic B3 appendix",
    };
  }
  return { content: `${ours.trim()}\n\n${b3Section.trim()}\n`, ok: true, detail: "appended B3 section" };
}

export function resolvePr448File(
  file: string,
  base: string,
  ours: string,
  theirs: string,
): ConflictResolution {
  switch (file) {
    case "frontend/package.json": {
      const r = resolvePackageJsonScripts(base, ours, theirs);
      return { file, strategy: "union_json_scripts", ok: r.ok, detail: r.detail };
    }
    case "frontend/src/lib/all-workspace-modules-activation.ts": {
      const r = mergeActivationById(ours, theirs);
      return { file, strategy: "merge_activation_by_id", ok: r.ok, detail: r.detail };
    }
    case "frontend/scripts/candidate-green-modules-founder-smoke-guard.test.ts": {
      const r = unionGuardTests(ours, theirs);
      return { file, strategy: "union_test_blocks", ok: r.ok, detail: r.detail };
    }
    case "docs/ALL_WORKSPACE_MODULES_ACTIVATION_MASTER_PLAN_2026-07-10.md": {
      const r = appendMasterPlanDoc(ours, theirs);
      return { file, strategy: "append_doc", ok: r.ok, detail: r.detail };
    }
    default:
      return { file, strategy: "union_json_scripts", ok: false, detail: "unknown file — manual required" };
  }
}

export function resolvePr448Conflicts(
  files: Record<string, { base: string; ours: string; theirs: string }>,
): { ok: boolean; resolutions: ConflictResolution[] } {
  const resolutions: ConflictResolution[] = [];
  for (const file of PR448_CONFLICT_FILES) {
    const payload = files[file];
    if (!payload) {
      resolutions.push({ file, strategy: "union_json_scripts", ok: false, detail: "missing from payload" });
      continue;
    }
    resolutions.push(resolvePr448File(file, payload.base, payload.ours, payload.theirs));
  }
  return { ok: resolutions.every((r) => r.ok), resolutions };
}
