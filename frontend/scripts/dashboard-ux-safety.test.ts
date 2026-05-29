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
  "src/components/job/candidate-job-discovery.tsx",
  "src/components/nightly-auto-apply-strip.tsx",
  "src/components/dashboard/OpportunityForecast.tsx",
  "src/components/dashboard/dashboard-verified-readiness-card.tsx",
  "src/components/candidate-workspace-subnav.tsx",
  "src/app/dashboard/identity/page.tsx",
  "src/app/dashboard/settings/auto-apply/page.tsx",
  "src/app/dashboard/career/page.tsx",
  "src/app/dashboard/billing/page.tsx",
];

const SUBNAV_I18N_KEYS = [
  "nav.profile",
  "nav.jobs",
  "careerCompassLink",
  "billingLink",
  "referralsLink",
  "identityLink",
  "calendarLink",
  "nightlyAutoApplyLink",
] as const;

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
  /AUTHOLOGIC_API_/,
  /CHECKOUT PAYMENT RAILS/i,
  /Checkout payment rails/i,
];

/** User-facing i18n must not leak internal env names or internal billing labels. */
const FORBIDDEN_IN_I18N = [
  /AUTHOLOGIC_API_LOGIN/,
  /AUTHOLOGIC_API_KEY/,
  /Checkout payment rails \(Stripe\)/i,
  /CHECKOUT PAYMENT RAILS/i,
  /TWIN applies autonomously/i,
];

/** Dashboard CTA keys — values must stay honest (no live-apply overclaim). */
const I18N_KEY_ASSERTIONS: { key: string; mustNotMatch?: RegExp[]; mustInclude?: string }[] = [
  {
    key: "nightlyAutoApplyTrigger",
    mustNotMatch: [/\bRun now\b/i],
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
  {
    key: "billingCheckoutMethodsEyebrow",
    mustInclude: "Payment methods",
    mustNotMatch: [/rails/i, /STRIPE\)/i],
  },
  {
    key: "identityNotConfigured",
    mustNotMatch: [/AUTHOLOGIC/i, /\bKYC\b/i],
    mustInclude: "not available",
  },
  {
    key: "nightlyAutoApplyBlockedUntilChecklist",
    mustInclude: "readiness",
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

const subnav = read("src/components/candidate-workspace-subnav.tsx");
for (const key of SUBNAV_I18N_KEYS) {
  const lookup = key.startsWith("nav.") ? key : `dashboard.${key}`;
  assert(subnav.includes(`t("${lookup}")`), `Subnav must use i18n key ${lookup}`);
}
assert(subnav.includes("flex-wrap"), "Subnav must wrap labels instead of clipping");

const i18n = read("src/lib/i18n.ts");
for (const pattern of FORBIDDEN_IN_I18N) {
  assert(!pattern.test(i18n), `i18n must not contain forbidden pattern ${pattern}`);
}

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

const autoApplyPage = read("src/app/dashboard/settings/auto-apply/page.tsx");
assert(
  !autoApplyPage.includes("nightlyAutoApplyTrigger") && !autoApplyPage.includes("/api/v1/auto-apply/trigger"),
  "Auto-apply settings must not expose Run now / trigger sweep in UI",
);
assert(
  autoApplyPage.includes("verified_readiness_ready") || autoApplyPage.includes("canEnableAutonomous"),
  "Auto-apply settings must gate on verified readiness",
);

const guardPath = "src/lib/job-apply-actions-guard.ts";
assert(read(guardPath).includes("can_submit_delegated_application"), "Delegated apply must stay gated");

console.log("dashboard-ux-safety: ok");
