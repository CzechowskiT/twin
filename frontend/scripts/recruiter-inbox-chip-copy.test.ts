import assert from "node:assert/strict";
import test from "node:test";

import { localizeRecruiterInboxChipText } from "../src/lib/recruiter-inbox-chip-copy";

test("known English demo reasons localize to Polish", () => {
  assert.equal(
    localizeRecruiterInboxChipText("Low algorithmic fit — recruiter decision required", "pl"),
    "Niska zgodność algorytmiczna — wymagana decyzja rekrutera",
  );
  assert.equal(
    localizeRecruiterInboxChipText("No skills list on profile (+1)", "pl"),
    "Brak listy umiejętności w profilu (+1)",
  );
  assert.equal(
    localizeRecruiterInboxChipText("Candidate location differs from posting", "pl"),
    "Lokalizacja kandydata różni się od ogłoszenia",
  );
  assert.equal(
    localizeRecruiterInboxChipText("Candidate target role title aligns with posting", "pl"),
    "Docelowa rola kandydata pasuje do ogłoszenia",
  );
  assert.equal(
    localizeRecruiterInboxChipText("Profile skills overlap: python, postgresql", "pl"),
    "Umiejętności z profilu pokrywają się: Python, Postgresql",
  );
  assert.equal(
    localizeRecruiterInboxChipText("Profile skills found in posting text: python, postgresql", "pl"),
    "Umiejętności z profilu znalezione w treści ogłoszenia: Python, Postgresql",
  );
});

test("English locale leaves known strings unchanged", () => {
  const en = "Low algorithmic fit — recruiter decision required";
  assert.equal(localizeRecruiterInboxChipText(en, "en"), en);
});

test("unknown freeform strings pass through in PL", () => {
  const custom = "Custom recruiter note from ATS";
  assert.equal(localizeRecruiterInboxChipText(custom, "pl"), custom);
});
