import assert from "node:assert/strict";
import test from "node:test";

import {
  headerSessionNavLinks,
  isSessionNavLinkActive,
  sessionPanelHref,
  sessionPersonaHomeRedirect,
} from "../src/lib/persona-access";

test("sessionPersonaHomeRedirect keeps same-persona marketing lanes", () => {
  assert.equal(sessionPersonaHomeRedirect("/for-candidates", "candidate"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-recruiters", "recruiter"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-companies", "company"), null);
  assert.equal(sessionPersonaHomeRedirect("/for-investors", "investor"), null);
});

test("headerSessionNavLinks restores full candidate tab set", () => {
  const candidate = headerSessionNavLinks("candidate", true);
  assert.deepEqual(candidate.map((l) => l.href), [
    "/dashboard#dashboard-jobs",
    "/dashboard#dashboard-applications",
    "/dashboard/calendar",
    "/dashboard",
    "/profile",
    "/dashboard/calendar#calendar-connections-heading",
  ]);

  for (const persona of ["recruiter", "investor", "company"] as const) {
    const links = headerSessionNavLinks(persona, true);
    assert.equal(links.length, 3);
    assert.equal(links[0]?.href, "/dashboard/calendar");
    assert.equal(links[1]?.href, sessionPanelHref(persona));
    assert.equal(links[2]?.href, "/demo");
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
