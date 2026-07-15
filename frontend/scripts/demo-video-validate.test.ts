/**
 * Unit guard — demo:video:validate + visual-validate script structure.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("validate script checks ffprobe video streams and min duration", () => {
  const script = readFileSync(join(root, "scripts/demo-video-validate.ts"), "utf8");
  assert.match(script, /ffprobe/);
  assert.match(script, /MIN_DURATION_SEC = 30/);
  assert.match(script, /twin-product-film-pl\.mp4/);
  assert.match(script, /twin-product-film-en\.webm/);
  assert.match(script, /\.vtt/);
  assert.match(script, /WEBVTT/);
  assert.match(script, /<!DOCTYPE/);
});

test("render script outputs all 8 asset paths", () => {
  const script = readFileSync(join(root, "scripts/demo-video-render.ts"), "utf8");
  assert.match(script, /remotion render/);
  assert.match(script, /ffmpeg/);
  assert.match(script, /twin-product-film/);
  assert.match(script, /vttCaptions/);
  assert.match(script, /--force/);
});

test("visual-validate script rejects blank/white/uniform frames", () => {
  const script = readFileSync(join(root, "scripts/demo-video-visual-validate.ts"), "utf8");
  assert.match(script, /MAX_WHITE_PCT/);
  assert.match(script, /MAX_UNIFORM_PCT/);
  assert.match(script, /MIN_ENTROPY/);
  assert.match(script, /sceneDiversity/);
  assert.match(script, /poster is blank/);
  assert.match(script, /GATE@/);
});

test("remotion scenes use dedicated components without app CSS imports", () => {
  const film = readFileSync(join(root, "remotion/src/ProductFilm.tsx"), "utf8");
  assert.match(film, /InboxChaosScene/);
  assert.match(film, /TalentMemoryScene/);
  assert.match(film, /CandidateProfileScene/);
  assert.match(film, /RecruiterInboxScene/);
  assert.match(film, /CompanyCockpitScene/);
  assert.match(film, /CalendarScene/);
  assert.match(film, /BrandCtaScene/);
  assert.doesNotMatch(film, /@\/components/);
  assert.doesNotMatch(film, /globals\.css/);
  const theme = readFileSync(join(root, "remotion/src/theme.ts"), "utf8");
  assert.match(theme, /bgDark/);
  assert.match(theme, /font:/);
});
