import assert from "node:assert/strict";
import test from "node:test";

import {
  headerSessionNavLinks,
  isSessionNavLinkActive,
  momentumRailCtas,
  sessionPanelHref,
  sessionPersonaHomeRedirect,
} from "../src/lib/persona-access";

test("sessionPersonaHomeRedirect keeps same-persona marketing lanes", () => {
  assert.equal(sessionPersonaHomeRedirect("/for-candidates", "candidate"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-recruiters", "recruiter"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-companies", "company"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-investors", "investor"), null);
});

test("headerSessionNavLinks shows Kalendarz | Panel | Demo for every persona", () => {
  for (const persona of ["candidate", "recruiter", "investor", "company"] as const) {
    const links = headerSessionNavLinks(persona, true);
    assert.equal(links.length, 3);
    assert.equal(links[0]?.href, "/dashboard/calendar");
    assert.equal(links[0]?.labelKey, "dashboard.calendarLink");
    assert.equal(links[1]?.href, sessionPanelHref(persona));
    assert.equal(links[1]?.labelKey, "nav.dashboard");
    assert.equal(links[2]?.href, "/demo");
    assert.equal(links[2]?.labelKey, "nav.demo");
  }
});

test("isSessionNavLinkActive matches dashboard section hashes", () => {
  assert.equal(
    isSessionNavLinkActive("/dashboard", "#dashboard-applications", "/dashboard#dashboard-applications"),
    true,
  );
  assert.equal(isSessionNavLinkActive("/dashboard", "", "/dashboard#dashboard-jobs"), false);
});

test("isSessionNavLinkActive highlights recruiter panel routes", () => {
  assert.equal(isSessionNavLinkActive("/recruiter/inbox", "", "/workspace/recruiter"), true);
  assert.equal(isSessionNavLinkActive("/workspace/recruiter", "", "/workspace/recruiter"), true);
});

test("sessionPersonaHomeRedirect allows shared calendar and demo", () => {
  assert.equal(sessionPersonaHomeRedirect("/dashboard/calendar", "recruiter"), null);
  assert.equal(sessionPersonaHomeRedirect("/demo", "investor"), null);
});

test("sessionPersonaHomeRedirect still redirects cross-lane product routes", () => {
  assert.equal(
    sessionPersonaHomeRedirect("/recruiter/inbox", "candidate"),
    "/workspace/candidate",
  );
  assert.equal(
    sessionPersonaHomeRedirect("/dashboard", "recruiter"),
    "/workspace/recruiter",
  );
});

test("momentumRailCtas sends recruiters to recruiter workspace, not candidate dashboard", () => {
  const loggedOut = momentumRailCtas("/for-recruiters", "app", "recruiter", false);
  assert.equal(loggedOut[0]?.href, "/workspace/recruiter");
  assert.equal(loggedOut[0]?.labelKey, "site.momentumCtaWorkspace");
  assert.equal(loggedOut[1]?.href, "/login/recruiter");

  const loggedIn = momentumRailCtas("/for-recruiters", "app", "recruiter", true);
  assert.equal(loggedIn[0]?.href, "/workspace/recruiter");
  assert.equal(loggedIn[1]?.href, "/recruiter/inbox");
});

test("momentumRailCtas keeps candidate dashboard shortcuts on profile", () => {
  const ctas = momentumRailCtas("/profile", "app", "candidate", true);
  assert.equal(ctas[0]?.href, "/dashboard");
  assert.equal(ctas[1]?.href, "/dashboard/billing");
});
