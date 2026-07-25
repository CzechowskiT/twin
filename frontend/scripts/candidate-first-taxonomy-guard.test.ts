/**
 * Guard: candidate-first taxonomy marks org-first as secondary + docs present.
 */
import { existsSync, readFileSync } from "node:fs";
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

const requiredDocs = [
  "docs/CANDIDATE_FIRST_PILOT.md",
  "docs/CANDIDATE_FIRST_TAXONOMY.json",
  "docs/CANDIDATE_FIRST_READINESS.json",
  "docs/CANDIDATE_FIRST_CHECKLISTS.md",
  "docs/CANDIDATE_FIRST_INVITATION_PACK.md",
  "docs/CANDIDATE_FIRST_SEND_SAFETY.md",
  "docs/CANDIDATE_FIRST_SUCCESS_CRITERIA.md",
  "docs/CANDIDATE_FIRST_ANALYTICS.md",
  "docs/CANDIDATE_FIRST_SUPPORT_OPS.md",
  "docs/CANDIDATE_FIRST_TROUBLESHOOTING.md",
];
for (const rel of requiredDocs) {
  if (!existsSync(join(root, rel))) {
    throw new Error(`missing required doc: ${rel}`);
  }
}
console.log("candidate-first-taxonomy-guard: ok");
