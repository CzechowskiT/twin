/**
 * R-019 production delete-account evidence guard.
 * - Requires evidence doc.
 * - Fails closed if doc claims CLOSED/PASS while schema-blocker markers absent.
 * - Does not mint JWT; does not print secrets.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidencePath = join(repoRoot, "docs/R019_DELETE_ACCOUNT_PRODUCTION_EVIDENCE_2026-07-15.md");

function main(): void {
  if (!existsSync(evidencePath)) {
    console.error("verify:prod-delete-account-smoke FAIL — missing evidence doc");
    process.exit(1);
  }
  const body = readFileSync(evidencePath, "utf8");
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const push = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  push("no_demo_account", !/demo@twin\.career/.test(body) || /Never used/.test(body), "demo account ban");
  push("no_jwt_literal", !/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\./.test(body), "no JWT in evidence");
  push("documents_schema_blocker", /schema mismatch/i.test(body) && /050_stripe_webhook_events/.test(body), "schema blocker documented");
  push("negatives_recorded", /401/.test(body) && /422/.test(body), "401/422 negatives");
  push("not_fake_closed", !/\*\*CLOSED\*\*/.test(body), "must not claim CLOSED while blocked");
  push("status_partial_or_blocked", /PARTIAL|BLOCKED/.test(body), "honest status");

  let failed = 0;
  console.log("verify:prod-delete-account-smoke\n");
  for (const c of checks) {
    console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name}: ${c.detail}`);
    if (!c.ok) failed++;
  }
  // Explicit non-zero when production delete not proven PASS
  if (!/\*\*PASS\*\*.*delete/i.test(body) && !/delete smoke \*\*PASS\*\*/i.test(body)) {
    console.log("  [INFO] production delete E2E not PASS — exit 2 (blocked)");
    process.exit(failed > 0 ? 1 : 2);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
