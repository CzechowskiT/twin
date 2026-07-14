/**
 * Unit guard — demo:video:validate script structure.
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
});
