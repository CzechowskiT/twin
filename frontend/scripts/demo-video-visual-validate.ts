#!/usr/bin/env npx tsx
/**
 * Visual frame validation for demo video assets — `npm run demo:video:visual-validate`
 * FAIL on blank/white/uniform frames, low entropy, or missing scene diversity.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = join(root, "public/demo");
const auditDir = join(root, "reports/demo-visual-validate");

const SAMPLE_TIMES_SEC = [0, 3, 5, 10, 18, 22, 26, 33, 38, 41];
const GATE_TIMES_SEC = [3, 7, 12, 20, 28, 35, 40];

const MAX_WHITE_PCT = 70;
const MAX_UNIFORM_PCT = 80;
const MIN_ENTROPY = 3.5;
const MIN_LUMINANCE_RANGE = 0.15;
const MIN_FRAME_DIFF = 0.02;

type FrameMetrics = {
  timeSec: number;
  luminance: number;
  whitePct: number;
  uniformPct: number;
  entropy: number;
  dominantColors: string[];
  isBlank: boolean;
  pngPath: string;
};

type LocaleResult = {
  locale: string;
  frames: FrameMetrics[];
  sceneDiversity: number;
  issues: string[];
};

function extractFrame(videoPath: string, timeSec: number, outPath: string): void {
  execSync(`ffmpeg -y -ss ${timeSec} -i "${videoPath}" -vframes 1 -update 1 "${outPath}"`, {
    stdio: "pipe",
  });
}

function rgbToLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return r > 240 && g > 240 && b > 240;
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

  for (let i = 0; i < data.length; i += info.channels) {
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
  }

  const dominantEntry = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const uniformPct = dominantEntry ? (dominantEntry[1] / pixels) * 100 : 100;
  const whitePct = (whiteCount / pixels) * 100;

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
  const isBlank =
    whitePct > MAX_WHITE_PCT ||
    uniformPct > MAX_UNIFORM_PCT ||
    entropy < MIN_ENTROPY ||
    lumRange < MIN_LUMINANCE_RANGE;

  return {
    timeSec,
    luminance: lumSum / pixels,
    whitePct,
    uniformPct,
    entropy,
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
  const videoPath = join(demoDir, `twin-product-film-${locale}.mp4`);
  const posterPath = join(demoDir, `twin-product-film-poster-${locale}.webp`);
  const issues: string[] = [];
  const frames: FrameMetrics[] = [];

  if (!existsSync(videoPath)) {
    return { locale, frames: [], sceneDiversity: 0, issues: [`missing ${videoPath}`] };
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
        `${locale}@${f.timeSec}s: BLANK (white=${f.whitePct.toFixed(1)}% uniform=${f.uniformPct.toFixed(1)}% entropy=${f.entropy.toFixed(2)})`,
      );
    }
  }

  let diversitySum = 0;
  for (let i = 1; i < frames.length; i++) {
    diversitySum += frameDiff(frames[i - 1]!, frames[i]!);
  }
  const sceneDiversity = diversitySum / (frames.length - 1);
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

  return { locale, frames, sceneDiversity, issues };
}

function printTable(results: LocaleResult[]): void {
  console.log("\n| Locale | Time | Luminance | White% | Uniform% | Entropy | Blank |");
  console.log("|--------|------|-----------|--------|----------|---------|-------|");
  for (const r of results) {
    for (const f of r.frames) {
      console.log(
        `| ${r.locale} | ${f.timeSec}s | ${f.luminance.toFixed(3)} | ${f.whitePct.toFixed(1)} | ${f.uniformPct.toFixed(1)} | ${f.entropy.toFixed(2)} | ${f.isBlank ? "FAIL" : "OK"} |`,
      );
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(auditDir, { recursive: true });
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

  console.log("\ndemo:video:visual-validate PASS — visible product content confirmed");
}

void main();
