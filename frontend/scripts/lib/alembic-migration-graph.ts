/**
 * Alembic migration graph helpers — parse revision/down_revision and validate chains.
 * Used by alembic-duplicate-revision-guard tests and integration readiness checks.
 */

export type MigrationMeta = {
  file: string;
  revision: string;
  downRevision: string | null;
};

export const REVISION_RE = /revision:\s*str\s*=\s*["']([^"']+)["']/;
export const DOWN_REVISION_RE = /down_revision:\s*[^=]*=\s*["']([^"']+)["']/;

export function parseMigrationSource(file: string, src: string): MigrationMeta {
  const revMatch = src.match(REVISION_RE);
  const downMatch = src.match(DOWN_REVISION_RE);
  if (!revMatch) {
    throw new Error(`${file}: missing revision`);
  }
  return {
    file,
    revision: revMatch[1],
    downRevision: downMatch?.[1] ?? null,
  };
}

export function findDuplicateRevisions(migrations: MigrationMeta[]): string[] {
  const byRevision = new Map<string, string[]>();
  for (const m of migrations) {
    const files = byRevision.get(m.revision) ?? [];
    files.push(m.file);
    byRevision.set(m.revision, files);
  }
  return [...byRevision.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([revision, files]) => `${revision} in ${files.join(", ")}`);
}

export function findBrokenParents(migrations: MigrationMeta[]): string[] {
  const revisions = new Set(migrations.map((m) => m.revision));
  return migrations
    .filter((m) => m.downRevision !== null && !revisions.has(m.downRevision))
    .map((m) => `${m.revision} → missing parent ${m.downRevision}`);
}

export function findHeads(migrations: MigrationMeta[]): string[] {
  const childOf = new Set(
    migrations.map((m) => m.downRevision).filter((d): d is string => d !== null),
  );
  return migrations.filter((m) => !childOf.has(m.revision)).map((m) => m.revision);
}

/** Revisions not reachable from any root (down_revision null) via child links. */
export function findOrphans(migrations: MigrationMeta[]): string[] {
  const roots = migrations.filter((m) => m.downRevision === null).map((m) => m.revision);
  const childOf = new Map<string, string[]>();
  for (const m of migrations) {
    if (m.downRevision) {
      const kids = childOf.get(m.downRevision) ?? [];
      kids.push(m.revision);
      childOf.set(m.downRevision, kids);
    }
  }
  const reachable = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const rev = stack.pop()!;
    if (reachable.has(rev)) continue;
    reachable.add(rev);
    for (const kid of childOf.get(rev) ?? []) stack.push(kid);
  }
  return migrations.filter((m) => !reachable.has(m.revision)).map((m) => m.revision);
}

const DESTRUCTIVE_PATTERNS = [
  /op\.drop_table/i,
  /op\.drop_column/i,
  /op\.execute\s*\(\s*["']DROP\s/i,
  /batch_op\.drop_column/i,
];

export function findDestructiveOps(migrations: MigrationMeta[], srcByFile?: Map<string, string>): string[] {
  if (!srcByFile) return [];
  const hits: string[] = [];
  for (const m of migrations) {
    const src = srcByFile.get(m.file);
    if (!src) continue;
    for (const pat of DESTRUCTIVE_PATTERNS) {
      if (pat.test(src)) {
        hits.push(`${m.revision} (${m.file}): destructive op detected`);
        break;
      }
    }
  }
  return hits;
}

export function findCycle(migrations: MigrationMeta[]): string[] | null {
  const byRevision = new Map(migrations.map((m) => [m.revision, m]));
  for (const start of migrations) {
    const visited = new Set<string>();
    let current: MigrationMeta | undefined = start;
    while (current?.downRevision) {
      if (visited.has(current.revision)) {
        return [...visited, current.revision];
      }
      visited.add(current.revision);
      current = byRevision.get(current.downRevision);
    }
  }
  return null;
}

export function buildChain(from: string, migrations: MigrationMeta[]): string[] {
  const byRevision = new Map(migrations.map((m) => [m.revision, m]));
  const chain = [from];
  while (true) {
    const child = migrations.find((m) => m.downRevision === chain[chain.length - 1]);
    if (!child) break;
    chain.push(child.revision);
  }
  return chain;
}

/** Validate a contiguous chain segment; parent before `expected[0]` may live outside `migrations`. */
export function validateChainSegment(
  migrations: MigrationMeta[],
  expected: string[],
): { ok: true } | { ok: false; reason: string } {
  const duplicates = findDuplicateRevisions(migrations);
  if (duplicates.length > 0) {
    return { ok: false, reason: `duplicate revisions: ${duplicates.join("; ")}` };
  }
  const byRevision = new Map(migrations.map((m) => [m.revision, m]));
  for (const rev of expected) {
    if (!byRevision.has(rev)) {
      return { ok: false, reason: `missing revision ${rev}` };
    }
  }
  for (let i = 1; i < expected.length; i++) {
    const child = byRevision.get(expected[i])!;
    if (child.downRevision !== expected[i - 1]) {
      return {
        ok: false,
        reason: `${expected[i]} down_revision expected ${expected[i - 1]}, got ${child.downRevision}`,
      };
    }
  }
  const chain = buildChain(expected[0], migrations);
  for (let i = 0; i < expected.length; i++) {
    if (chain[i] !== expected[i]) {
      return {
        ok: false,
        reason: `chain mismatch at ${i}: expected ${expected[i]}, got ${chain[i] ?? "(missing)"}`,
      };
    }
  }
  return { ok: true };
}

export function validateLinearChain(
  migrations: MigrationMeta[],
  expected: string[],
): { ok: true } | { ok: false; reason: string } {
  const segment = validateChainSegment(migrations, expected);
  if (!segment.ok) return segment;
  const broken = findBrokenParents(migrations);
  if (broken.length > 0) {
    return { ok: false, reason: `broken parents: ${broken.join("; ")}` };
  }
  const cycle = findCycle(migrations);
  if (cycle) {
    return { ok: false, reason: `cycle detected: ${cycle.join(" → ")}` };
  }
  const heads = findHeads(migrations);
  if (heads.length !== 1) {
    return { ok: false, reason: `expected 1 head, found ${heads.length}: ${heads.join(", ")}` };
  }
  return { ok: true };
}

/** Fixture: full post-merge stack including #448 migration 073. */
export function waveStackWith073Fixture(): MigrationMeta[] {
  return [
    { file: "070_candidate_trust_center.py", revision: "070_candidate_trust_center", downRevision: "069_candidate_career_compass" },
    {
      file: "071_recruiter_workspace_activation.py",
      revision: "071_recruiter_workspace_activation",
      downRevision: "070_candidate_trust_center",
    },
    {
      file: "072_recruiter_talent_pool_trust_review_c2.py",
      revision: "072_recruiter_talent_pool_trust_review_c2",
      downRevision: "071_recruiter_workspace_activation",
    },
    {
      file: "073_candidate_referrals.py",
      revision: "073_candidate_referrals",
      downRevision: "072_recruiter_talent_pool_trust_review_c2",
    },
  ];
}

/** Fixture: full release train 070→077 after C3–C5 + candidate slice rebased post-#448. */
export function waveStack077Fixture(): MigrationMeta[] {
  const base = waveStackWith073Fixture();
  return [
    ...base,
    {
      file: "074_recruiter_notification_preferences_c3.py",
      revision: "074_recruiter_notification_preferences_c3",
      downRevision: "073_candidate_referrals",
    },
    {
      file: "075_recruiter_saved_views_c4.py",
      revision: "075_recruiter_saved_views_c4",
      downRevision: "074_recruiter_notification_preferences_c3",
    },
    {
      file: "076_recruiter_activity_timeline_c5.py",
      revision: "076_recruiter_activity_timeline_c5",
      downRevision: "075_recruiter_saved_views_c4",
    },
    {
      file: "077_candidate_activity_timeline.py",
      revision: "077_candidate_activity_timeline",
      downRevision: "076_recruiter_activity_timeline_c5",
    },
  ];
}

export const WAVE_070_077_CHAIN = [
  "070_candidate_trust_center",
  "071_recruiter_workspace_activation",
  "072_recruiter_talent_pool_trust_review_c2",
  "073_candidate_referrals",
  "074_recruiter_notification_preferences_c3",
  "075_recruiter_saved_views_c4",
  "076_recruiter_activity_timeline_c5",
  "077_candidate_activity_timeline",
] as const;
