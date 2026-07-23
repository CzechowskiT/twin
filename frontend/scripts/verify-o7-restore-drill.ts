/**
 * Static O7 restore-drill evidence guard — fails unless canonical evidence is present
 * and claims PASS with required metadata markers (no secrets / dump bytes).
 *
 * Primary: 2026-07-23 fresh drill @ Alembic 096.
 * Historical: 2026-07-15 evidence retained for continuity.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidencePath = join(repoRoot, "docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md");
const legacyEvidencePath = join(repoRoot, "docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-15.md");
const logPath = join(repoRoot, "docs/BACKUP_RESTORE_DRILL_LOG.md");
const decisionPackPath = join(repoRoot, "docs/FOUNDER_GATE_F_FINAL_DECISION_PACK_2026-07-23.md");

type Check = { name: string; ok: boolean; detail: string };

function main(): void {
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  push("evidence_doc_exists", existsSync(evidencePath), evidencePath);
  push("legacy_evidence_retained", existsSync(legacyEvidencePath), legacyEvidencePath);
  push("drill_log_exists", existsSync(logPath), logPath);
  push("founder_decision_pack_exists", existsSync(decisionPackPath), decisionPackPath);

  if (existsSync(evidencePath)) {
    const body = readFileSync(evidencePath, "utf8");
    push("result_pass", /\*\*PASS\*\*/.test(body), "PASS marker");
    push("run_id", /o7-r020-20260723T065951Z/.test(body), "run id");
    push("sha256", /f3f239b0da96ffc74e594caa6ad27b4824cd6090f8c766ea8a55b93d58d2e7ab/.test(body), "dump checksum");
    push("alembic_096", /096_connector_secret_hash_widen/.test(body), "alembic 096");
    push("staging_isolation", /monorail\.proxy\.rlwy\.net/.test(body) && /autorack\.proxy\.rlwy\.net/.test(body), "prod≠staging hosts");
    push("restore_exit_0", /Single `pg_restore`/.test(body) && /\*\*0\*\* in \*\*396 s\*\*/.test(body), "staging restore exit 0");
    push("counts_match", /users \*\*23\*\*/.test(body) && /job_matches \*\*1431\*\*/.test(body), "count sanity");
    push("no_secret_url", !/postgresql:\/\/[^:]+:[^@]+@/.test(body), "no postgres URL with password");
    push("no_dump_bytes", !/\\x[0-9a-f]{20,}/i.test(body), "no binary dump payload");
    push("stance_unchanged", /Launch:\*\* NO-GO|Launch\*\*: NO-GO|Launch.*NO-GO/i.test(body) && /Gate F:\*\* PENDING|Gate F\*\*: PENDING|Gate F.*PENDING/i.test(body), "stance holds");
  }

  if (existsSync(logPath)) {
    const log = readFileSync(logPath, "utf8");
    push("log_row_2026_07_23", /2026-07-23/.test(log) && /o7-r020|f3f239b0|O7_RESTORE_DRILL_EVIDENCE_2026-07-23/.test(log), "append-only PASS row");
  }

  if (existsSync(decisionPackPath)) {
    const pack = readFileSync(decisionPackPath, "utf8");
    push("decision_options", /Option 1/.test(pack) && /Option 2/.test(pack) && /Option 3/.test(pack), "options 1–3");
    push("no_gate_f_yes_declared", /No Gate F YES decided/i.test(pack), "no Gate F YES flip");
    push("recommend_only", /Recommended technical decision/i.test(pack), "advisory recommendation present");
  }

  let failed = 0;
  console.log("verify:o7-restore-drill\n");
  for (const c of checks) {
    console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name}: ${c.detail}`);
    if (!c.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
