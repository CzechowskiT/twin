/**
 * Regression guard: logged-in candidates reach /dashboard/calendar without login/logout links.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  CANDIDATE_CALENDAR_HREF,
  calendarNavHref,
  candidateCalendarHref,
  headerSessionNavLinks,
  sessionPersonaHomeRedirect,
  sessionPersonaLockedByPath,
} from "../src/lib/persona-access";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ENTRY_POINT_FILES = [
  "src/lib/persona-access.ts",
  "src/components/candidate-workspace-subnav.tsx",
  "src/components/dashboard/dashboard-calendar-strip.tsx",
  "src/lib/dashboard-next-best-action.ts",
  "src/components/marketing/demo-product-walkthrough.tsx",
  "src/components/site-header-bar.tsx",
] as const;

const FORBIDDEN_CALENDAR_HREFS = ["/login", "/logout", "/login/candidate", "/login/recruiter", "#"];

test("candidate calendar canonical href", () => {
  assert.equal(CANDIDATE_CALENDAR_HREF, "/dashboard/calendar");
  assert.equal(candidateCalendarHref(), "/dashboard/calendar");
  assert.equal(calendarNavHref("candidate"), "/dashboard/calendar");
  assert.equal(calendarNavHref("recruiter"), "/recruiter/calendar");
});

test("header Kalendarz tab points to candidate calendar, not auth routes", () => {
  const links = headerSessionNavLinks("candidate", true);
  const calendar = links.find((l) => l.labelKey === "dashboard.calendarLink");
  assert.ok(calendar, "expected calendar nav item");
  assert.equal(calendar.href, "/dashboard/calendar");
  for (const forbidden of FORBIDDEN_CALENDAR_HREFS) {
    assert.notEqual(calendar.href, forbidden);
    assert.ok(!calendar.href.startsWith("/login"), `calendar href must not be login: ${calendar.href}`);
  }
  assert.notEqual(calendar.href, "#");
});

test("session persona locks to candidate on calendar path", () => {
  assert.equal(sessionPersonaLockedByPath("/dashboard/calendar"), "candidate");
  assert.equal(sessionPersonaHomeRedirect("/dashboard/calendar", "candidate"), null);
  assert.equal(sessionPersonaHomeRedirect("/dashboard/calendar", "recruiter"), "/recruiter/calendar");
});

test("entry points use canonical calendar href helper or constant", () => {
  for (const rel of ENTRY_POINT_FILES) {
    const src = read(rel);
    assert.ok(
      src.includes("candidateCalendarHref") || src.includes("CANDIDATE_CALENDAR_HREF"),
      `${rel} must import canonical calendar href`,
    );
  }
});

test("site header calendar nav uses Link, not logout handler", () => {
  const header = read("src/components/site-header-bar.tsx");
  assert.match(header, /headerSessionNavLinks/);
  assert.match(header, /sessionNavLinks\.map/);
  assert.doesNotMatch(
    header,
    /dashboard\.calendarLink[\s\S]{0,120}onClick=\{logout\}/,
    "calendar nav must not wire to logout",
  );
});

test("calendar page does not clear token on load errors", () => {
  const page = read("src/app/dashboard/calendar/page.tsx");
  assert.doesNotMatch(page, /clearToken\(\)/, "calendar page must not clear session locally");
  assert.match(page, /candidateCalendarHref\(\)/);
  assert.match(page, /LOGIN_PATH\.candidate/);
});
