/**
 * Static O7 restore-drill evidence guard — fails unless canonical evidence is present
 * and claims PASS with required metadata markers (no secrets / dump bytes).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidencePath = join(repoRoot, "docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-15.md");
const logPath = join(repoRoot, "docs/BACKUP_RESTORE_DRILL_LOG.md");

type Check = { name: string; ok: boolean; detail: string };

function main(): void {
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  push("evidence_doc_exists", existsSync(evidencePath), evidencePath);
  push("drill_log_exists", existsSync(logPath), logPath);

  if (existsSync(evidencePath)) {
    const body = readFileSync(evidencePath, "utf8");
    push("result_pass", /\*\*PASS\*\*/.test(body), "PASS marker");
    push("run_id", /o7-r019-20260715T181851Z/.test(body), "run id");
    push("sha256", /308d5121856e37f3b7dd6f208b6f6be41c1c3e176226eb9d8ac864d33faa1c73/.test(body), "dump checksum");
    push("staging_isolation", /monorail\.proxy\.rlwy\.net/.test(body) && /autorack\.proxy\.rlwy\.net/.test(body), "prod≠staging hosts");
    push("restore_exit_0", /Single `pg_restore`/.test(body) && /\*\*0\*\* in 93 s/.test(body), "staging restore exit 0");
    push("no_secret_url", !/postgresql:\/\/[^:]+:[^@]+@/.test(body), "no postgres URL with password");
    push("no_dump_bytes", !/\\x[0-9a-f]{20,}/i.test(body), "no binary dump payload");
  }

  if (existsSync(logPath)) {
    const log = readFileSync(logPath, "utf8");
    push("log_row_2026_07_15", /2026-07-15/.test(log) && /\*\*PASS\*\*/.test(log), "append-only PASS row");
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
