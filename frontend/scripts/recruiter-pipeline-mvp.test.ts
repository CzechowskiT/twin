import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  pipelineScheduledSlotLabel,
  recruiterPipelineFilterLabelKey,
  recruiterPipelineStatusLabelKey,
} from "../src/lib/recruiter-pipeline";
import { dictionaries, en } from "../src/lib/i18n";

const ROOT = join(import.meta.dirname, "..");

test("pipeline page and client exist", () => {
  const page = readFileSync(join(ROOT, "src/app/recruiter/pipeline/page.tsx"), "utf8");
  const client = readFileSync(join(ROOT, "src/app/recruiter/pipeline/recruiter-pipeline-client.tsx"), "utf8");
  assert.match(page, /RecruiterPipelineClient/);
  assert.match(client, /RecruiterWorkspaceNav/);
});

test("scheduled badge marker on pipeline cards", () => {
  const client = readFileSync(join(ROOT, "src/app/recruiter/pipeline/recruiter-pipeline-client.tsx"), "utf8");
  assert.match(client, /RECRUITER_SCHEDULING_VISUAL_MARKERS\.scheduledBadge/);
  assert.match(client, /pipelineScheduledSlotLabel/);
  const label = pipelineScheduledSlotLabel(
    { manual_slot_at: "2026-06-15T14:30:00", manual_slot_duration_minutes: 45 },
    "en",
  );
  assert.ok(label && label.includes("2026"));
});

test("pipeline i18n keys exist", () => {
  assert.ok(en.recruiterPipeline.title.length > 0);
  assert.ok(en.recruiterPipeline.scheduledSlot.length > 0);
  for (const key of ["filterAll", "pipelineStatusInvited", "nextActionAccepted"] as const) {
    assert.ok(en.recruiterPipeline[key]?.length > 0, `missing ${key}`);
  }
  assert.equal(recruiterPipelineStatusLabelKey("invited"), "pipelineStatusInvited");
  assert.equal(recruiterPipelineFilterLabelKey("all"), "filterAll");
  for (const locale of ["pl", "es", "de"] as const) {
    assert.ok(dictionaries[locale].recruiterPipeline.title.length > 0);
  }
});
