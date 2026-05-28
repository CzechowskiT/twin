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
  !page.includes("DashboardVerifiedReadinessCard") ||
    page.includes("{user ? <DashboardVerifiedReadinessCard />"),
  "Card must only render for authenticated user shell",
);

console.log("verified-readiness-guard: ok");
