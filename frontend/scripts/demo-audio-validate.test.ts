/**
 * Guard — demo ambient audio assets exist and controller respects user-gesture policy.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import { DEMO_AUDIO_SOURCES } from "../src/lib/demo/demo-audio-config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public/demo");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const MIN_AUDIO_BYTES = 8_000;

test("1 MP3 and OGG ambient assets exist in public/demo", () => {
  const mp3 = join(publicDir, "twin-demo-ambient.mp3");
  const ogg = join(publicDir, "twin-demo-ambient.ogg");
  assert.ok(existsSync(mp3), "missing twin-demo-ambient.mp3");
  assert.ok(existsSync(ogg), "missing twin-demo-ambient.ogg");
  assert.ok(statSync(mp3).size >= MIN_AUDIO_BYTES, "mp3 too small");
  assert.ok(statSync(ogg).size >= MIN_AUDIO_BYTES, "ogg too small");
});

test("2 audio config exposes canonical paths", () => {
  assert.equal(DEMO_AUDIO_SOURCES.mp3, "/demo/twin-demo-ambient.mp3");
  assert.equal(DEMO_AUDIO_SOURCES.ogg, "/demo/twin-demo-ambient.ogg");
});

test("3 controller uses preload=none and no autoplay", () => {
  const controller = read("src/components/marketing/demo/sales/demo-audio-controller.tsx");
  assert.match(controller, /preload="none"/);
  assert.match(controller, /gestureUnlocked/);
  assert.doesNotMatch(controller, /autoplay/);
  assert.match(controller, /data-demo-audio-toggle/);
});

test("4 analytics exports audio events without PII", () => {
  const analytics = read("src/lib/demo/demo-analytics.ts");
  assert.match(analytics, /demo_audio_impression/);
  assert.match(analytics, /demo_audio_play/);
  assert.match(analytics, /demo_audio_pause/);
  assert.match(analytics, /demo_audio_mute/);
  assert.match(analytics, /demo_audio_unmute/);
  assert.doesNotMatch(analytics, /email/);
});

test("5 audio disabled when save-data active", () => {
  const flow = read("src/components/marketing/demo/sales/interactive-role-flow.tsx");
  assert.match(flow, /enabled=\{!saveData\}/);
});
