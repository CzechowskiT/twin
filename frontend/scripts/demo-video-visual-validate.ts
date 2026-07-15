#!/usr/bin/env npx tsx
/**
 * Visual frame validation for demo video assets — `npm run demo:video:visual-validate`
 * FAIL on blank/white/uniform frames, low entropy, missing scene diversity,
 * static periods (>2s without motion), or center-empty frames.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const inputDir = argValue("--input-dir") ?? join(root, "public/demo");
const auditDir = argValue("--output-dir") ?? join(root, "reports/demo-visual-validate");

const FILM_DURATION_SEC = 45;
const SAMPLE_INTERVAL_SEC = 2;
const SAMPLE_TIMES_SEC = Array.from(
  { length: Math.floor(FILM_DURATION_SEC / SAMPLE_INTERVAL_SEC) + 1 },
  (_, i) => i * SAMPLE_INTERVAL_SEC,
).filter((t) => t <= FILM_DURATION_SEC && t > 0);

const GATE_TIMES_SEC = [3, 8, 13, 21, 29, 36, 41];

const MAX_WHITE_PCT = 85;
const MAX_UNIFORM_PCT = 92;
const MIN_ENTROPY = 2.8;
const MIN_LUMINANCE_RANGE = 0.12;
const MIN_FRAME_DIFF = 0.02;
const MIN_PAIR_MOTION = 0.015;
const MIN_CENTER_ENTROPY = 2.5;
const MAX_CENTER_DARK_LUM = 0.12;

type FrameMetrics = {
  timeSec: number;
  luminance: number;
  whitePct: number;
  uniformPct: number;
  entropy: number;
  centerEmptyPct: number;
  centerEntropy: number;
  dominantColors: string[];
  isBlank: boolean;
  pngPath: string;
};

type LocaleResult = {
  locale: string;
  frames: FrameMetrics[];
  sceneDiversity: number;
  motionGate: { timeSec: number; diff: number; pass: boolean }[];
  issues: string[];
};

function extractFrame(videoPath: string, timeSec: number, outPath: string): void {
  // -ss after -i avoids black keyframe at t=0; +0.04s skips encoder lead-in
  const seek = Math.max(0.04, timeSec);
  execSync(`ffmpeg -y -i "${videoPath}" -ss ${seek} -vframes 1 -update 1 "${outPath}"`, {
    stdio: "pipe",
  });
}

function rgbToLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r > 240 && g > 240 && b > 240;
}

function isNearDarkEmpty(r: number, g: number, b: number): boolean {
  return rgbToLuminance(r, g, b) < 0.06;
}

function colorKey(r: number, g: number, b: number): string {
  const qr = Math.round(r / 32) * 32;
  const qg = Math.round(g / 32) * 32;
  const qb = Math.round(b / 32) * 32;
  return `#${qr.toString(16).padStart(2, "0")}${qg.toString(16).padStart(2, "0")}${qb.toString(16).padStart(2, "0")}`;
}

async function analyzeFrame(pngPath: string, timeSec: number): Promise<FrameMetrics> {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  let whiteCount = 0;
  let lumSum = 0;
  let lumMin = 1;
  let lumMax = 0;
  const colorCounts = new Map<string, number>();
  const lumHistogram = new Array(256).fill(0);

  const cx0 = Math.floor(info.width * 0.325);
  const cx1 = Math.floor(info.width * 0.675);
  const cy0 = Math.floor(info.height * 0.325);
  const cy1 = Math.floor(info.height * 0.675);
  let centerPixels = 0;
  let centerEmpty = 0;
  let centerLumSum = 0;
  const centerLumHistogram = new Array(256).fill(0);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const lum = rgbToLuminance(r, g, b);
      lumSum += lum;
      lumMin = Math.min(lumMin, lum);
      lumMax = Math.max(lumMax, lum);
      const lumBin = Math.min(255, Math.floor(lum * 255));
      lumHistogram[lumBin] += 1;
      if (isNearWhite(r, g, b)) whiteCount += 1;
      const key = colorKey(r, g, b);
      colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);

      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) {
        centerPixels += 1;
        centerLumSum += lum;
        const centerBin = Math.min(255, Math.floor(lum * 255));
        centerLumHistogram[centerBin] += 1;
        if (isNearDarkEmpty(r, g, b)) centerEmpty += 1;
      }
    }
  }

  const dominantEntry = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const uniformPct = dominantEntry ? (dominantEntry[1] / pixels) * 100 : 100;
  const whitePct = (whiteCount / pixels) * 100;
  const centerEmptyPct = centerPixels > 0 ? (centerEmpty / centerPixels) * 100 : 100;
  const centerLumAvg = centerPixels > 0 ? centerLumSum / centerPixels : 0;
  let centerEntropy = 0;
  for (const count of centerLumHistogram) {
    if (count === 0) continue;
    const p = count / centerPixels;
    centerEntropy -= p * Math.log2(p);
  }

  let entropy = 0;
  for (const count of lumHistogram) {
    if (count === 0) continue;
    const p = count / pixels;
    entropy -= p * Math.log2(p);
  }

  const dominantColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  const lumRange = lumMax - lumMin;
  const centerIsEmpty =
    centerLumAvg < MAX_CENTER_DARK_LUM && centerEntropy < MIN_CENTER_ENTROPY;
  const isBlank =
    (entropy < MIN_ENTROPY && lumRange < MIN_LUMINANCE_RANGE) ||
    (uniformPct > MAX_UNIFORM_PCT && entropy < 3.0) ||
    (whitePct > MAX_WHITE_PCT && entropy < 3.2) ||
    centerIsEmpty;

  return {
    timeSec,
    luminance: lumSum / pixels,
    whitePct,
    uniformPct,
    entropy,
    centerEmptyPct,
    centerEntropy,
    dominantColors,
    isBlank,
    pngPath,
  };
}

function frameDiff(a: FrameMetrics, b: FrameMetrics): number {
  const imgA = readFileSync(a.pngPath);
  const imgB = readFileSync(b.pngPath);
  const len = Math.min(imgA.length, imgB.length);
  let diff = 0;
  for (let i = 0; i < len; i += 100) {
    if (imgA[i] !== imgB[i]) diff += 1;
  }
  return diff / (len / 100);
}

async function validateLocale(locale: "en" | "pl"): Promise<LocaleResult> {
  const videoPath = join(inputDir, `twin-product-film-${locale}.mp4`);
  const posterPath = join(inputDir, `twin-product-film-poster-${locale}.webp`);
  const issues: string[] = [];
  const frames: FrameMetrics[] = [];

  if (!existsSync(videoPath)) {
    return { locale, frames: [], sceneDiversity: 0, motionGate: [], issues: [`missing ${videoPath}`] };
  }

  const localeDir = join(auditDir, locale);
  mkdirSync(localeDir, { recursive: true });

  for (const t of SAMPLE_TIMES_SEC) {
    const pngPath = join(localeDir, `frame-${t}s.png`);
    extractFrame(videoPath, t, pngPath);
    frames.push(await analyzeFrame(pngPath, t));
  }

  for (const f of frames) {
    if (f.isBlank) {
      issues.push(
        `${locale}@${f.timeSec}s: BLANK (white=${f.whitePct.toFixed(1)}% uniform=${f.uniformPct.toFixed(1)}% entropy=${f.entropy.toFixed(2)} centerEnt=${f.centerEntropy.toFixed(2)} centerDark=${f.centerEmptyPct.toFixed(1)}%)`,
      );
    }
  }

  const motionGate: LocaleResult["motionGate"] = [];
  for (let i = 1; i < frames.length; i++) {
    const diff = frameDiff(frames[i - 1]!, frames[i]!);
    const timeSec = frames[i]!.timeSec;
    const pass = diff >= MIN_PAIR_MOTION;
    motionGate.push({ timeSec, diff, pass });
    if (!pass) {
      issues.push(
        `${locale} MOTION@${frames[i - 1]!.timeSec}s→${timeSec}s: STATIC (diff=${diff.toFixed(4)} < ${MIN_PAIR_MOTION})`,
      );
    }
  }

  let diversitySum = 0;
  for (let i = 1; i < frames.length; i++) {
    diversitySum += frameDiff(frames[i - 1]!, frames[i]!);
  }
  const sceneDiversity = frames.length > 1 ? diversitySum / (frames.length - 1) : 0;
  if (sceneDiversity < MIN_FRAME_DIFF) {
    issues.push(`${locale}: low scene diversity (${sceneDiversity.toFixed(4)} < ${MIN_FRAME_DIFF})`);
  }

  if (existsSync(posterPath)) {
    const posterPng = join(localeDir, "poster.png");
    execSync(`ffmpeg -y -i "${posterPath}" -update 1 "${posterPng}"`, { stdio: "pipe" });
    const posterMetrics = await analyzeFrame(posterPng, -1);
    if (posterMetrics.isBlank) {
      issues.push(`${locale}: poster is blank/uniform`);
    }
  } else {
    issues.push(`${locale}: missing poster`);
  }

  for (const t of GATE_TIMES_SEC) {
    const gatePath = join(localeDir, `gate-${t}s.png`);
    extractFrame(videoPath, t, gatePath);
    const gateMetrics = await analyzeFrame(gatePath, t);
    if (gateMetrics.isBlank) {
      issues.push(`${locale} GATE@${t}s: FAIL — frame looks empty`);
    }
  }

  return { locale, frames, sceneDiversity, motionGate, issues };
}

function printTable(results: LocaleResult[]): void {
  console.log("\n| Locale | Time | Luminance | White% | Uniform% | Entropy | CenterEmpty% | Blank |");
  console.log("|--------|------|-----------|--------|----------|---------|--------------|-------|");
  for (const r of results) {
    for (const f of r.frames) {
      console.log(
        `| ${r.locale} | ${f.timeSec}s | ${f.luminance.toFixed(3)} | ${f.whitePct.toFixed(1)} | ${f.uniformPct.toFixed(1)} | ${f.entropy.toFixed(2)} | ${f.centerEmptyPct.toFixed(1)} | ${f.isBlank ? "FAIL" : "OK"} |`,
      );
    }
  }

  console.log("\n| Locale | Interval | Motion diff | Pass |");
  console.log("|--------|----------|-------------|------|");
  for (const r of results) {
    for (const m of r.motionGate) {
      const prev = m.timeSec - SAMPLE_INTERVAL_SEC;
      console.log(
        `| ${r.locale} | ${prev}s→${m.timeSec}s | ${m.diff.toFixed(4)} | ${m.pass ? "OK" : "FAIL"} |`,
      );
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(auditDir, { recursive: true });
  console.log(`input-dir: ${inputDir}`);
  console.log(`output-dir: ${auditDir}`);
  console.log(`sample-interval: ${SAMPLE_INTERVAL_SEC}s (motion gate)`);
  const results: LocaleResult[] = [];

  for (const locale of ["en", "pl"] as const) {
    results.push(await validateLocale(locale));
  }

  printTable(results);

  const allIssues = results.flatMap((r) => r.issues);
  if (allIssues.length > 0) {
    console.error("\ndemo:video:visual-validate FAILED:");
    for (const issue of allIssues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  console.log("\ndemo:video:visual-validate PASS — visible product content + continuous motion confirmed");
}

void main();
