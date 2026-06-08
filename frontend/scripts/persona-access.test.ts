import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarNavHref,
  headerAccountLinks,
  headerMarketingLaneLinks,
  headerSessionNavLinks,
  isSessionNavLinkActive,
  momentumRailCtas,
  sessionPanelHref,
  sessionPersonaHomeRedirect,
  showMarketingPersonaNav,
} from "../src/lib/persona-access";

test("sessionPersonaHomeRedirect keeps same-persona marketing lanes", () => {
  assert.equal(sessionPersonaHomeRedirect("/for-candidates", "candidate"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-recruiters", "recruiter"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-companies", "company"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-investors", "investor"), null);
});

test("headerSessionNavLinks routes recruiters to recruiter calendar placeholder", () => {
  const candidateLinks = headerSessionNavLinks("candidate", true);
  assert.equal(candidateLinks[0]?.href, "/dashboard/calendar");

  const recruiterLinks = headerSessionNavLinks("recruiter", true);
  assert.equal(recruiterLinks[0]?.href, "/recruiter/calendar");
  assert.equal(recruiterLinks[1]?.href, sessionPanelHref("recruiter"));
});

test("calendarNavHref is persona-aware", () => {
  assert.equal(calendarNavHref("candidate"), "/dashboard/calendar");
  assert.equal(calendarNavHref("recruiter"), "/recruiter/calendar");
});

test("isSessionNavLinkActive matches dashboard section hashes", () => {
  assert.equal(
    isSessionNavLinkActive("/dashboard", "#dashboard-applications", "/dashboard#dashboard-applications"),
    true,
  );
  assert.equal(isSessionNavLinkActive("/dashboard", "", "/dashboard#dashboard-jobs"), false);
});

test("isSessionNavLinkActive highlights recruiter panel and calendar routes", () => {
  assert.equal(isSessionNavLinkActive("/recruiter/inbox", "", "/workspace/recruiter"), true);
  assert.equal(isSessionNavLinkActive("/recruiter/calendar", "", "/recruiter/calendar"), true);
});

test("sessionPersonaHomeRedirect sends recruiters away from candidate calendar", () => {
  assert.equal(sessionPersonaHomeRedirect("/dashboard/calendar", "recruiter"), "/recruiter/calendar");
  assert.equal(sessionPersonaHomeRedirect("/dashboard/calendar", "candidate"), null);
  assert.equal(sessionPersonaHomeRedirect("/recruiter/calendar", "recruiter"), null);
});

test("sessionPersonaHomeRedirect still redirects cross-lane product routes", () => {
  assert.equal(sessionPersonaHomeRedirect("/recruiter/inbox", "candidate"), "/workspace/candidate");
  assert.equal(sessionPersonaHomeRedirect("/dashboard", "recruiter"), "/workspace/recruiter");
});

test("momentumRailCtas on recruiter calendar links to inbox and jobs", () => {
  const ctas = momentumRailCtas("/recruiter/calendar", "app", "recruiter", true);
  assert.equal(ctas[0]?.href, "/recruiter/inbox");
  assert.equal(ctas[1]?.href, "/recruiter/jobs");
});

test("headerAccountLinks for logged-in users show panel and logout only", () => {
  const recruiter = headerAccountLinks("recruiter", true);
  assert.equal(recruiter[0]?.href, sessionPanelHref("recruiter"));
  assert.equal(recruiter[0]?.labelKey, "nav.dashboard");
  assert.equal(recruiter[1]?.isLogout, true);
});

test("marketing persona nav is logged-out marketing chrome only", () => {
  assert.equal(showMarketingPersonaNav(false, true), true);
  assert.equal(headerMarketingLaneLinks().some((l) => l.href === "/demo"), true);
});
