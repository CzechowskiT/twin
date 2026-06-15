import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildOutreachDraftText,
  RECRUITER_TALENT_RADAR_MARKERS,
} from "../src/lib/recruiter-talent-radar";
import {
  buildDraftPreparedDecisionBody,
  showsDraftPreparedBadge,
  TALENT_RADAR_DECISION_MARKERS,
} from "../src/lib/recruiter-talent-radar-decisions";
import { dictionaries, en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const cardSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-candidate-card.tsx");
const clientSrc = readSrc("src/app/recruiter/talent-radar/recruiter-talent-radar-client.tsx");
const modalSrc = readSrc("src/components/recruiter/talent-radar/talent-radar-decision-modals.tsx");

const sampleRow = {
  id: "cand-42",
  application_id: 42,
  display_name: "Alex K.",
  fit_label: "good" as const,
  score: 72,
  status: "ready_to_review" as const,
  why_surfaced: ["Skill overlap", "Prior shortlist"],
  why_now: ["No contact 90 days"],
  evidence: ["Skill overlap"],
  risks: ["Needs review"],
  missing_data: [],
  recommended_next_action: "prepare_outreach_draft" as const,
  data_confidence: "medium" as const,
  human_decision_required: true as const,
  job_title: "Backend Engineer",
};

test("1 draft CTA exists on candidate card", () => {
  assert.match(cardSrc, /ctaDraft/);
  assert.match(cardSrc, /onClick=\{onDraft\}/);
});

test("2 clicking draft CTA opens draft modal via client handler", () => {
  assert.match(clientSrc, /TalentRadarDraftModal/);
  assert.match(clientSrc, /handleDraft/);
  assert.match(modalSrc, /TalentRadarDraftModal/);
  assert.match(modalSrc, /TALENT_RADAR_DECISION_MARKERS\.draftModal/);
});

test("3 panel title includes nie wysłano / not sent", () => {
  assert.match(pl.recruiterTalentRadar.draftTitle, /nie wysłano/i);
  assert.match(en.recruiterTalentRadar.draftTitle.toLowerCase(), /not sent/);
  assert.match(modalSrc, /draftTitle/);
});

test("4 draft content contains role context and personalization placeholder", () => {
  const draftPl = buildOutreachDraftText(sampleRow, "Backend Engineer", "pl");
  const draftEn = buildOutreachDraftText(sampleRow, "Backend Engineer", "en");
  assert.match(draftPl, /Backend Engineer/);
  assert.match(draftPl, /personalizacj/i);
  assert.match(draftEn, /Personalization/i);
});

test("5 draft content does not claim guaranteed fit", () => {
  const blob = JSON.stringify({
    pl: buildOutreachDraftText(sampleRow, "Role", "pl"),
    en: buildOutreachDraftText(sampleRow, "Role", "en"),
  });
  assert.doesNotMatch(blob, /guaranteed fit|pewne dopasowanie|perfect fit/i);
});

test("6 draft content does not say message was sent", () => {
  const draft = buildOutreachDraftText(sampleRow, "Role", "en");
  assert.doesNotMatch(draft, /has been sent|message sent|wysłano wiadomo/i);
  assert.match(en.recruiterTalentRadar.draftDisclaimer.toLowerCase(), /did not send/);
});

test("7 copy button exists", () => {
  assert.match(modalSrc, /draftCopy/);
  assert.match(modalSrc, /TALENT_RADAR_DECISION_MARKERS\.draftCopyButton/);
});

test("8 closing panel works", () => {
  assert.match(modalSrc, /draftClose/);
  assert.match(clientSrc, /setDraftModal\(null\)/);
});

test("9 draft_prepared decision call is triggered with radar snapshots", () => {
  assert.match(clientSrc, /buildDraftPreparedDecisionBody/);
  const body = buildDraftPreparedDecisionBody(sampleRow, "7");
  assert.equal(body.action_type, "draft_prepared");
  assert.equal(body.application_id, 42);
  assert.equal(body.meta?.candidate_id, "cand-42");
  assert.equal(body.meta?.job_id, "7");
  assert.equal(body.meta?.radar_score_snapshot, "72");
  assert.equal(body.meta?.radar_fit_label_snapshot, "good");
  assert.equal(body.meta?.source, "talent_radar");
});

test("10 on API success candidate card shows draft prepared badge", () => {
  assert.match(cardSrc, /badgeDraftPrepared/);
  assert.match(cardSrc, /showsDraftPreparedBadge/);
  assert.ok(
    showsDraftPreparedBadge({
      id: 1,
      application_id: 42,
      company_slug: "acme",
      action_type: "draft_prepared",
      meta: { source: "talent_radar" },
      snooze_until: null,
      created_at: null,
      decision_state: "active",
    }),
  );
  assert.equal(pl.recruiterTalentRadar.badgeDraftPrepared, "Szkic przygotowany — nie wysłano");
});

test("11 on API fail local draft still appears with audit warning", () => {
  assert.match(clientSrc, /auditWarning:\s*true/);
  assert.match(modalSrc, /draftAuditFailed/);
  assert.match(modalSrc, /TALENT_RADAR_DECISION_MARKERS\.draftAuditWarning/);
});

test("12 no email send endpoint is called from radar client", () => {
  assert.doesNotMatch(clientSrc, /send.*email|\/email\/|auto.*send|wyslij.*wiadom/i);
  assert.match(clientSrc, /\/api\/recruiter\/talent-radar\/decisions/);
});

test("13 no auto outreach text in draft-related keys", () => {
  const blob = JSON.stringify({
    en: en.recruiterTalentRadar,
    pl: pl.recruiterTalentRadar,
  });
  assert.doesNotMatch(blob, /automatically contact|auto-contact candidates/i);
  assert.match(en.recruiterTalentRadar.draftRecruiterReviewNote.toLowerCase(), /no automatic outreach/);
});

test("14 human review copy remains visible on card and draft modal", () => {
  assert.match(cardSrc, /humanDecisionRequired/);
  assert.match(modalSrc, /draftRecruiterReviewNote/);
  assert.equal(RECRUITER_TALENT_RADAR_MARKERS.draftPanel, "recruiter-talent-radar-draft-panel");
  for (const locale of ["en", "pl"] as const) {
    assert.ok(dictionaries[locale].recruiterTalentRadar.humanDecisionRequired.length > 0, locale);
  }
});
