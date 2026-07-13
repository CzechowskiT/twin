/**
 * PR #448 conflict resolver — deterministic rules for 4 known merge files.
 * Used by integration-simulator when #448 merge conflicts after #449+#450.
 */

export const PR448_CONFLICT_FILES = [
  "frontend/package.json",
  "frontend/src/lib/all-workspace-modules-activation.ts",
  "frontend/scripts/candidate-green-modules-founder-smoke-guard.test.ts",
  "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md",
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
    const baseObj = base ? (JSON.parse(base) as { scripts?: Record<string, string> }) : {};
    const oursObj = JSON.parse(ours) as { scripts?: Record<string, string> };
    const theirsObj = JSON.parse(theirs) as { scripts?: Record<string, string> };
    const merged = { ...oursObj, ...theirsObj };
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

/** Merge activation registry — union module keys (candidate_referrals + C2 recruiter modules). */
export function mergeActivationById(ours: string, theirs: string): { content: string; ok: boolean; detail: string } {
  const hasReferrals = /candidate_referrals\s*:/.test(theirs) || /candidate_referrals\s*:/.test(ours);
  const hasC2 = /recruiter_talent_pool\s*:/.test(ours) || /recruiter_talent_pool\s*:/.test(theirs);
  if (!hasReferrals || !hasC2) {
    return {
      content: ours,
      ok: false,
      detail: `missing modules: referrals=${hasReferrals} c2=${hasC2}`,
    };
  }
  if (/candidate_referrals\s*:/.test(ours)) {
    return { content: ours, ok: true, detail: "referrals already present in ours" };
  }
  const blockMatch = theirs.match(/candidate_referrals:\s*\{[\s\S]*?\n  \},?\n/);
  if (!blockMatch) {
    return { content: ours, ok: false, detail: "referrals block not extractable" };
  }
  const marker = "export const WORKSPACE_MODULE_ACTIVATION";
  const idx = ours.indexOf(marker);
  if (idx < 0) {
    return { content: ours + "\n" + blockMatch[0], ok: true, detail: "appended referrals block at EOF" };
  }
  const merged = ours.slice(0, idx) + blockMatch[0] + ours.slice(idx);
  return { content: merged, ok: true, detail: "inserted candidate_referrals before activation array" };
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
    case "docs/CANDIDATE_GREEN_MODULES_FOUNDER_SMOKE_2026-07-10.md": {
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
