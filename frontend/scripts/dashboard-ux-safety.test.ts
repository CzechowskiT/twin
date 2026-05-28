/**
 * Static regression guard for candidate dashboard UX safety copy.
 * Complements Playwright unauth smoke and verified-readiness-guard.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const COMPONENT_PATHS = [
  "src/components/job-list.tsx",
  "src/components/nightly-auto-apply-strip.tsx",
  "src/components/dashboard/OpportunityForecast.tsx",
  "src/components/dashboard/dashboard-verified-readiness-card.tsx",
];

/** Hard-coded UI literals only (components must use t() for copy). */
const FORBIDDEN_IN_COMPONENTS = [
  /\bApply now\b/i,
  /\bAuto apply\b/i,
  /\bRun now\b/i,
  /\bKYC verified\b/i,
  /\bFully verified\b/i,
  /\bGuaranteed interview\b/i,
  /\bEmployer validated\b/i,
  /\bSubmit application\b/i,
];

/** Dashboard CTA keys — values must stay honest (no live-apply overclaim). */
const I18N_KEY_ASSERTIONS: { key: string; mustNotMatch?: RegExp[]; mustInclude?: string }[] = [
  {
    key: "nightlyAutoApplyTrigger",
    mustNotMatch: [/\bRun now\b/i, /\bAuto-apply\b/i],
    mustInclude: "test sweep",
  },
  {
    key: "nightlyAutoApplyStripActive",
    mustNotMatch: [/^Active —/i, /\bAuto-apply\b/i],
    mustInclude: "Scheduled",
  },
  {
    key: "prepareApplication",
    mustNotMatch: [/\bAuto apply\b/i],
    mustInclude: "Prepare",
  },
  {
    key: "identityLink",
    mustNotMatch: [/\(KYC\)/],
  },
];

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function enValueForKey(i18n: string, key: string): string | null {
  const block = i18n.match(/const en = \{[\s\S]*?\n\};/);
  if (!block) return null;
  const re = new RegExp(`\\b${key}:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, "m");
  const m = block[0].match(re);
  return m ? m[1].replace(/\\n/g, "\n") : null;
}

for (const rel of COMPONENT_PATHS) {
  const raw = read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/api\/v1\/auto-apply\/[^\s'"`]+/g, "")
    .replace(/\/dashboard\/settings\/auto-apply/g, "");
  for (const pattern of FORBIDDEN_IN_COMPONENTS) {
    assert(!pattern.test(raw), `${rel}: forbidden UI pattern ${pattern}`);
  }
}

const i18n = read("src/lib/i18n.ts");
for (const rule of I18N_KEY_ASSERTIONS) {
  const value = enValueForKey(i18n, rule.key);
  assert(value != null, `Missing EN i18n key dashboard.${rule.key}`);
  if (rule.mustInclude) {
    assert(
      value!.toLowerCase().includes(rule.mustInclude.toLowerCase()),
      `dashboard.${rule.key} must include "${rule.mustInclude}"`,
    );
  }
  for (const bad of rule.mustNotMatch ?? []) {
    assert(!bad.test(value!), `dashboard.${rule.key} must not match ${bad}`);
  }
}

const jobList = read("src/components/job-list.tsx");
assert(jobList.includes("applyActionsGuard"), "Job list must accept applyActionsGuard");
assert(jobList.includes("canPrepareApplicationPackage"), "Job list must gate on readiness");

const guardPath = "src/lib/job-apply-actions-guard.ts";
assert(read(guardPath).includes("can_submit_delegated_application"), "Delegated apply must stay gated");

console.log("dashboard-ux-safety: ok");
