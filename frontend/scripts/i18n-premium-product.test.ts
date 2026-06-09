import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { en, dictionaries } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PREMIUM_SURFACES = [
  "src/components/marketing/interactive-demo-walkthrough.tsx",
  "src/components/ux/guided-empty-state.tsx",
  "src/app/recruiter/inbox/recruiter-inbox-client.tsx",
  "src/components/dashboard/matches-section.tsx",
  "src/components/dashboard/applications-section.tsx",
  "src/components/dashboard/dashboard-calendar-strip.tsx",
] as const;

const REQUIRED_KEYS = [
  "ux.guidedEmptyMatchesTitle",
  "ux.guidedEmptyInboxTitle",
  "interactiveDemo.pageTitle",
  "dashboard.todayNbaRefineProfile",
  "dashboard.matchQualityExcellent",
  "dashboard.applicationTransparencyTitle",
  "recruiterInbox.decisionConsoleTitle",
  "recruiterCalendar.notLiveTitle",
  "login.hubTitle",
  "register.hubTitle",
] as const;

test("premium surfaces route copy through t() — no raw string literals for titles", () => {
  for (const relativePath of PREMIUM_SURFACES) {
    const src = readFileSync(join(root, relativePath), "utf8");
    assert.doesNotMatch(src, />\s*No strong matches yet\s*</, `${relativePath} hardcoded empty title`);
    assert.doesNotMatch(src, />\s*Decision console\s*</, `${relativePath} hardcoded decision console`);
  }
});

test("PL and ES include premium product keys", () => {
  for (const locale of ["pl", "es"] as const) {
    const dict = dictionaries[locale];
    for (const path of REQUIRED_KEYS) {
      const value = path.split(".").reduce<unknown>((cur, part) => {
        if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[part];
        return undefined;
      }, dict as unknown);
      assert.ok(typeof value === "string" && value.trim(), `${locale} missing ${path}`);
      const enValue = path.split(".").reduce<unknown>((cur, part) => {
        if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[part];
        return undefined;
      }, en as unknown);
      assert.notEqual(value, enValue, `${locale} still English for ${path}`);
    }
  }
});
