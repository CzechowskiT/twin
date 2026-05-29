/**
 * Static guardrails for the read-only verified readiness dashboard card.
 * Complements Playwright unauth smoke (no password / no live API token).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cardPath = join(
  root,
  "src/components/dashboard/dashboard-verified-readiness-card.tsx",
);
const hookPath = join(root, "src/hooks/dashboard/use-dashboard-verified-readiness.ts");
const pagePath = join(root, "src/app/dashboard/page.tsx");
const jobListPath = join(root, "src/components/job-list.tsx");
const guardLibPath = join(root, "src/lib/job-apply-actions-guard.ts");

const FORBIDDEN_IN_CARD = [
  /Apply now/i,
  /Auto apply/i,
  /auto-apply/i,
  /Submit application/i,
  /KYC verified/i,
  /Employer validated/i,
  /Guaranteed interview/i,
  /Fully verified/i,
  /<button[^>]*type=["']submit/i,
  /method:\s*["']POST["']/i,
];

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const card = read(cardPath);
const hook = read(hookPath);
const page = read(pagePath);
const jobList = read(jobListPath);
const guardLib = read(guardLibPath);

for (const pattern of FORBIDDEN_IN_CARD) {
  assert(!pattern.test(card), `Forbidden pattern in card: ${pattern}`);
}

assert(
  hook.includes('"/api/v1/candidates/me/verified-readiness"'),
  "Hook must call verified-readiness endpoint",
);
assert(!hook.includes('method: "POST"'), "Hook must not POST to verified-readiness");
assert(
  card.includes("delegatedBlocked") || card.includes("verifiedReadiness.delegatedBlocked"),
  "Card must surface delegated-apply blocked copy",
);
assert(
  page.includes("DashboardVerifiedReadinessCard"),
  "Dashboard page must mount verified readiness card",
);
assert(
  page.includes("useDashboardVerifiedReadiness"),
  "Dashboard page must load verified readiness once for card + apply guard",
);
assert(
  page.includes("applyActionsGuard"),
  "Dashboard page must pass applyActionsGuard to job surfaces",
);
assert(
  jobList.includes("prepareApplication") && jobList.includes("canPrepareApplicationPackage"),
  "Job list must gate prepare-application CTA on readiness",
);
assert(!/\bAuto-apply\b/i.test(jobList), "Job list must not show raw Auto-apply label");
assert(
  read(guardLibPath).includes("jobApplyActionsGuardFromReadiness"),
  "Apply guard helper must exist",
);
assert(
  guardLib.includes("can_prepare_application_package"),
  "Apply guard must read can_prepare_application_package from readiness gate",
);

console.log("verified-readiness-guard: ok");
