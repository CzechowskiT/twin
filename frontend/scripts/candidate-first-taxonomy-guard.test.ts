/**
 * Guard: candidate-first taxonomy marks org-first as secondary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");
const tax = JSON.parse(readFileSync(join(root, "docs/CANDIDATE_FIRST_TAXONOMY.json"), "utf8"));

if (tax.primary_product !== "candidate") {
  throw new Error("taxonomy primary_product must be candidate");
}
if (!String(tax.org_first_path || "").includes("SECONDARY_B2B")) {
  throw new Error("org_first_path must be SECONDARY_B2B_PILOT_PATH");
}
if (tax.alten_org_pack !== "NOT_PREPARED") {
  throw new Error("alten_org_pack must remain NOT_PREPARED");
}
if (!tax.verdicts?.A?.includes("CANDIDATE-FIRST PILOT READY")) {
  throw new Error("missing verdict A");
}
console.log("candidate-first-taxonomy-guard: ok");
