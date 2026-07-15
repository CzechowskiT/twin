#!/usr/bin/env npx tsx
/**
 * Validate physical demo video assets — `npm run demo:video:validate`
 * FAIL if files missing, duration < 30s, or streams are not real video.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = join(root, "public/demo");

const REQUIRED = [
  "twin-product-film-pl.mp4",
  "twin-product-film-en.mp4",
  "twin-product-film-pl.webm",
  "twin-product-film-en.webm",
  "twin-product-film-poster-pl.webp",
  "twin-product-film-poster-en.webp",
  "twin-product-film-pl.vtt",
  "twin-product-film-en.vtt",
] as const;

const MIN_DURATION_SEC = 30;
const CANONICAL_DURATION_SEC = 45;
const DURATION_TOLERANCE_SEC = 0.25;
const MIN_VIDEO_BYTES = 500_000;

type ProbeResult = {
  duration: number;
  hasVideo: boolean;
  codec: string;
};

function ffprobe(file: string): ProbeResult {
  const json = execSync(
    `ffprobe -v quiet -print_format json -show_streams -show_format "${file}"`,
    { encoding: "utf8" },
  );
  const data = JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; codec_name?: string }>;
  };
  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  return {
    duration: parseFloat(data.format?.duration ?? "0"),
    hasVideo: Boolean(videoStream),
    codec: videoStream?.codec_name ?? "none",
  };
}

function validateVideo(path: string, label: string): string[] {
  const issues: string[] = [];
  const size = statSync(path).size;
  if (size < MIN_VIDEO_BYTES) {
    issues.push(`${label}: file too small (${size} bytes) — likely fake/placeholder`);
  }
  const probe = ffprobe(path);
  if (!probe.hasVideo) {
    issues.push(`${label}: no video stream`);
  }
  if (probe.codec === "none" || probe.codec === "png" || probe.codec === "mjpeg") {
    issues.push(`${label}: invalid video codec ${probe.codec}`);
  }
  if (probe.duration < MIN_DURATION_SEC) {
    issues.push(`${label}: duration ${probe.duration.toFixed(1)}s < ${MIN_DURATION_SEC}s`);
  }
  if (/twin-product-film-(en|pl)\.(mp4|webm)$/.test(label) && Math.abs(probe.duration - CANONICAL_DURATION_SEC) > DURATION_TOLERANCE_SEC) {
    issues.push(`${label}: duration ${probe.duration.toFixed(3)}s outside ${CANONICAL_DURATION_SEC}±${DURATION_TOLERANCE_SEC}s`);
  }
  const bytes = readFileSync(path);
  const head = bytes.subarray(0, 512).toString("utf8", 0, 512);
  if (head.includes("<!DOCTYPE") || head.includes("<html")) {
    issues.push(`${label}: file is HTML, not video`);
  }
  return issues;
}

function validatePoster(path: string, label: string): string[] {
  const issues: string[] = [];
  if (statSync(path).size < 10_000) {
    issues.push(`${label}: poster too small`);
  }
  return issues;
}

function validateVtt(path: string, label: string): string[] {
  const issues: string[] = [];
  const content = readFileSync(path, "utf8");
  if (!content.startsWith("WEBVTT")) {
    issues.push(`${label}: missing WEBVTT header`);
  }
  if (!content.includes("-->")) {
    issues.push(`${label}: no cue timestamps`);
  }
  return issues;
}

function main(): void {
  const issues: string[] = [];

  for (const file of REQUIRED) {
    const path = join(demoDir, file);
    if (!existsSync(path)) {
      issues.push(`missing: ${file}`);
      continue;
    }
    if (file.endsWith(".mp4") || file.endsWith(".webm")) {
      issues.push(...validateVideo(path, file));
    } else if (file.endsWith(".webp")) {
      issues.push(...validatePoster(path, file));
    } else if (file.endsWith(".vtt")) {
      issues.push(...validateVtt(path, file));
    }
  }

  if (issues.length > 0) {
    console.error("demo:video:validate FAILED:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log("demo:video:validate PASS — all 8 assets are real video/poster/vtt");
}

main();
