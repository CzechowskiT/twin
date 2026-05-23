import assert from "node:assert/strict";
import test from "node:test";

import { sessionPersonaHomeRedirect } from "../src/lib/persona-access";

test("sessionPersonaHomeRedirect keeps persona marketing lanes (pricing hash URLs)", () => {
  const lanes = [
    "/for-candidates",
    "/for-recruiters",
    "/for-companies",
    "/for-investors",
  ] as const;
  for (const path of lanes) {
    for (const persona of ["candidate", "recruiter", "company", "investor"] as const) {
      assert.equal(
        sessionPersonaHomeRedirect(path, persona),
        null,
        `${path} should stay for ${persona}`,
      );
    }
  }
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
