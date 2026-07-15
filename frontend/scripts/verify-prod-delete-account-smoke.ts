/**
 * R-019 production delete-account evidence guard.
 * - Requires evidence doc.
 * - PASS path: documented production delete smoke PASS + LB-005 CLOSED + head 077.
 * - Blocked path: honest PARTIAL/BLOCKED with schema mismatch (exit 2).
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

  const deletePass =
    /\*\*PASS\*\*.*delete smoke|\*\*Result:\*\*\s*\*\*PASS\*\*|delete smoke \*\*PASS\*\*/i.test(body) ||
    (/Result:\*\*\s*\*\*PASS\*\*/i.test(body) && /delete smoke \*\*PASS\*\*/i.test(body));
  const lbClosed = /LB-005 status[\s\S]{0,200}\*\*CLOSED\*\*/i.test(body);
  const head077 = /077_candidate_activity_timeline/.test(body);
  const schemaResolved = head077 && !/503 schema mismatch/.test(body);

  push("no_demo_account", !/demo@twin\.career/.test(body) || /Never used/.test(body), "demo account ban");
  push("no_jwt_literal", !/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\./.test(body), "no JWT in evidence");
  push("negatives_recorded", /401/.test(body) && /422/.test(body), "401/422 negatives");

  if (deletePass && lbClosed && schemaResolved) {
    push("delete_e2e_pass", true, "production delete E2E PASS documented");
    push("lb005_closed", true, "LB-005 CLOSED");
    push("schema_head_077", true, "prod head 077 documented");
    let failed = 0;
    console.log("verify:prod-delete-account-smoke\n");
    for (const c of checks) {
      console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name}: ${c.detail}`);
      if (!c.ok) failed++;
    }
    process.exit(failed > 0 ? 1 : 0);
  }

  // Blocked / partial honesty path
  push(
    "documents_schema_blocker",
    /schema mismatch/i.test(body) && /050_stripe_webhook_events/.test(body),
    "schema blocker documented",
  );
  push("not_fake_closed", !/\*\*CLOSED\*\*/.test(body), "must not claim CLOSED while blocked");
  push("status_partial_or_blocked", /PARTIAL|BLOCKED/.test(body), "honest status");

  let failed = 0;
  console.log("verify:prod-delete-account-smoke\n");
  for (const c of checks) {
    console.log(`  [${c.ok ? "PASS" : "FAIL"}] ${c.name}: ${c.detail}`);
    if (!c.ok) failed++;
  }
  console.log("  [INFO] production delete E2E not PASS — exit 2 (blocked)");
  process.exit(failed > 0 ? 1 : 2);
}

main();
