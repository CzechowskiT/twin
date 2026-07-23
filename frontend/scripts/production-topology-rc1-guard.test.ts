/**
 * RC1 production topology drift guard — canonical URLs + stance freezes.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const topologyPath = join(root, "docs/PRODUCTION_TOPOLOGY_RC1.json");

test("PRODUCTION_TOPOLOGY_RC1.json exists and is valid", () => {
  assert.ok(existsSync(topologyPath));
  const doc = JSON.parse(readFileSync(topologyPath, "utf8")) as {
    schema: string;
    stance: Record<string, unknown>;
    canonical_urls: Record<string, string>;
    vercel: { project: string; dns_blocker: string; domains_attached: string[] };
    railway: { alembic_head_expected: string; api_service: string; worker_service: string };
    on_call_roles: { assignment: string; never_invent_human_names: boolean };
  };
  assert.equal(doc.schema, "twin.production_topology.rc1/v1");
  assert.equal(doc.stance.launch, "NO-GO");
  assert.equal(doc.stance.enrollment, "OFF");
  assert.equal(doc.stance.phase_3b, "BLOCKED");
  assert.equal(doc.stance.gate_f, "PASS");
  assert.equal(doc.stance.pilot, "READY_FOR_CONTROLLED_PILOT");
  assert.equal(doc.stance.external_pilot_enrollment_enabled, false);
  assert.equal(doc.canonical_urls.operational_frontend, "https://twin-sooty.vercel.app");
  assert.equal(doc.canonical_urls.temporary_pilot_canonical_url, "https://twin-sooty.vercel.app");
  assert.equal(doc.canonical_urls.api, "https://twin-production-bcd9.up.railway.app");
  assert.equal(doc.vercel.project, "twin");
  assert.ok(doc.vercel.domains_attached.includes("twin.care"));
  assert.ok(doc.vercel.domains_attached.includes("app.twin.care"));
  assert.equal(doc.vercel.dns_blocker, "afternic_nameservers");
  assert.equal(doc.railway.alembic_head_expected, "101_first_customer_activation");
  assert.equal(doc.railway.api_service, "twin");
  assert.equal(doc.railway.worker_service, "enthusiastic-encouragement");
  assert.equal(doc.on_call_roles.never_invent_human_names, true);
  assert.equal(doc.on_call_roles.assignment, "CONFIGURED");
  assert.ok(
    doc.verdict === "A_CONTROLLED_PILOT_OPERATIONAL" ||
      doc.verdict === "A_READY" ||
      doc.verdict === "B_AWAITING_ON_CALL" ||
      doc.verdict === "CONTROLLED_PILOT_OS_READY_AWAITING_FIRST_FOUNDER_APPROVED_ORG" ||
      doc.verdict === "FIRST_CUSTOMER_READY_WAITING_FOR_APPROVED_ORG",
  );
});

test("canonical alias script still documents twin-sooty operational URL", () => {
  const sh = readFileSync(join(root, "scripts/check-vercel-canonical-alias.sh"), "utf8");
  assert.match(sh, /twin-sooty\.vercel\.app/);
  assert.match(sh, /CANONICAL_PROJECT_NAME="twin"/);
});

test("production action gates keep Launch NO-GO and enrollment OFF", () => {
  const gates = readFileSync(join(root, "frontend/src/lib/production-action-gates.ts"), "utf8");
  assert.match(gates, /LAUNCH_STANCE_CANON = "NO-GO"/);
  assert.match(gates, /BLOCKED_BY_FOUNDER|READY_FOR_CONTROLLED_PILOT/);
  assert.doesNotMatch(gates, /EXTERNAL_PILOT_ENROLLMENT_ENABLED\s*=\s*true/);
});
