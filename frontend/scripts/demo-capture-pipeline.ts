#!/usr/bin/env npx tsx
/**
 * Real demo video + visual regression capture — Playwright frames → ffmpeg MP4/WebM.
 * Usage: PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 npx tsx scripts/demo-capture-pipeline.ts
 */
import { createHash } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync, readFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Page } from "playwright";

import {
  resolveSequenceScenes,
  sequenceDurationMs,
  type DemoSequenceId,
} from "../src/lib/demo/demo-scene-manifest";
import { buildVideoRenderConfig } from "../src/lib/demo/demo-video-export";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..");
const sha = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const previewUrl =
  process.env.DEMO_PREVIEW_URL ??
  "https://twin-git-feat-interactive-demo-homepage-candidate-twin.vercel.app";

type Locale = "en" | "pl";
type Target = "homepage" | "full";
type Tier = "short" | "full";

type CaptureSpec = {
  target: Target;
  locale: Locale;
  tier: Tier;
  sequenceId: DemoSequenceId;
  path: string;
  fps: number;
};

const CAPTURES: CaptureSpec[] = [
  {
    target: "homepage",
    locale: "en",
    tier: "short",
    sequenceId: "video-export-homepage",
    path: "/",
    fps: 2,
  },
  {
    target: "homepage",
    locale: "pl",
    tier: "short",
    sequenceId: "video-export-homepage",
    path: "/?lang=pl",
    fps: 2,
  },
  {
    target: "full",
    locale: "en",
    tier: "short",
    sequenceId: "video-export-full",
    path: "/demo",
    fps: 2,
  },
  {
    target: "full",
    locale: "pl",
    tier: "short",
    sequenceId: "video-export-full",
    path: "/demo?lang=pl",
    fps: 2,
  },
  {
    target: "homepage",
    locale: "en",
    tier: "full",
    sequenceId: "candidate-homepage-story",
    path: "/",
    fps: 1,
  },
  {
    target: "homepage",
    locale: "pl",
    tier: "full",
    sequenceId: "candidate-homepage-story",
    path: "/?lang=pl",
    fps: 1,
  },
  {
    target: "full",
    locale: "en",
    tier: "full",
    sequenceId: "full-product-story",
    path: "/demo",
    fps: 1,
  },
  {
    target: "full",
    locale: "pl",
    tier: "full",
    sequenceId: "full-product-story",
    path: "/demo?lang=pl",
    fps: 1,
  },
];

function outputBasename(target: Target, tier: Tier, locale: Locale): string {
  const prefix = target === "homepage" ? "twin-homepage-candidate" : "twin-demo";
  return `${prefix}-${tier}-${locale}-16x9`;
}

function legacyBasename(target: Target, locale: Locale): string {
  return `twin-demo-${target}-${locale}`;
}

function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

function hasFfmpeg(): boolean {
  return spawnSync("which", ["ffmpeg"]).status === 0;
}

async function dismissCookie(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /accept cookies/i });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

async function setLocale(page: Page, locale: Locale): Promise<void> {
  if (locale === "pl") {
    const pl = page.getByRole("button", { name: /polski|pl\b/i }).first();
    if (await pl.isVisible().catch(() => false)) await pl.click();
  }
}

async function scrollToStory(page: Page): Promise<void> {
  const section = page.locator('[data-testid="homepage-candidate-story-section"]');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
}

async function captureSceneFrames(
  page: Page,
  sequenceId: DemoSequenceId,
  outDir: string,
  selector: string,
  tier: Tier,
): Promise<number> {
  ensureDir(outDir);
  const scenes = resolveSequenceScenes(sequenceId);
  let frameIdx = 0;
  for (const scene of scenes) {
    const sceneEl = page.locator(`[data-demo-scene="${scene.id}"]`).first();
    if (await sceneEl.isVisible().catch(() => false)) {
      await sceneEl.screenshot({ path: join(outDir, `frame-${String(frameIdx).padStart(4, "0")}.png`) });
      frameIdx += 1;
    }
    if (tier === "full") {
      const seconds = Math.max(1, Math.ceil(scene.durationMs / 1000));
      for (let i = 0; i < seconds; i++) {
        await page.waitForTimeout(1000);
        const el = page.locator(selector).first();
        if (await el.isVisible().catch(() => false)) {
          await el.screenshot({ path: join(outDir, `frame-${String(frameIdx).padStart(4, "0")}.png`) });
          frameIdx += 1;
        }
      }
    } else {
      const mid = Math.max(1, Math.floor(scene.durationMs / 2000));
      for (let i = 0; i < mid; i++) {
        await page.waitForTimeout(500);
        const el = page.locator(selector).first();
        if (await el.isVisible().catch(() => false)) {
          await el.screenshot({ path: join(outDir, `frame-${String(frameIdx).padStart(4, "0")}.png`) });
          frameIdx += 1;
        }
      }
    }
  }
  return frameIdx;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function stitchVideo(framesDir: string, outMp4: string, outWebm: string, fps: number): void {
  const frames = readdirSync(framesDir).filter((f) => f.endsWith(".png")).sort();
  if (frames.length === 0) throw new Error(`No frames in ${framesDir}`);
  const inputPattern = join(framesDir, "frame-%04d.png");
  const scale = "scale=trunc(iw/2)*2:trunc(ih/2)*2";
  execSync(
    `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -vf "${scale}" -c:v libx264 -pix_fmt yuv420p "${outMp4}"`,
    { stdio: "inherit" },
  );
  execSync(
    `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -vf "${scale}" -c:v libvpx-vp9 -pix_fmt yuv420p "${outWebm}"`,
    { stdio: "inherit" },
  );
}

function extractPoster(mp4: string, poster: string): void {
  execSync(`ffmpeg -y -i "${mp4}" -vframes 1 -q:v 2 "${poster}"`, { stdio: "pipe" });
}

function ffprobeJson(path: string): Record<string, unknown> {
  const raw = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${path}"`,
    { encoding: "utf8" },
  );
  return JSON.parse(raw) as Record<string, unknown>;
}

function writeVtt(sequenceId: DemoSequenceId, locale: Locale, outPath: string): void {
  const scenes = resolveSequenceScenes(sequenceId);
  let offset = 0;
  const lines = ["WEBVTT", ""];
  for (const scene of scenes) {
    const start = formatVtt(offset);
    offset += scene.durationMs;
    const end = formatVtt(offset);
    lines.push(`${start} --> ${end}`);
    lines.push(`[${locale.toUpperCase()}] ${scene.id}`);
    lines.push("");
  }
  writeFileSync(outPath, lines.join("\n"));
}

function formatVtt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const frac = String(ms % 1000).padStart(3, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${frac}`;
}

async function captureVisualRegression(page: Page, label: string, visualDir: string): Promise<void> {
  ensureDir(visualDir);
  const shots = [
    { name: "homepage-hero", path: "/", scroll: false },
    { name: "homepage-story", path: "/", scroll: true },
    { name: "demo-player", path: "/demo", scroll: false },
    { name: "demo-catalog-collapsed", path: "/demo", scroll: false },
  ];
  for (const shot of shots) {
    await page.goto(`${baseUrl}${shot.path}`, { waitUntil: "domcontentloaded" });
    await dismissCookie(page);
    if (shot.scroll) await scrollToStory(page);
    const file = join(visualDir, `${label}-${shot.name}-${sha}-${ts}.png`);
    await page.screenshot({ path: file, fullPage: shot.scroll });
  }
}

async function main(): Promise<void> {
  if (!hasFfmpeg()) {
    console.error("ffmpeg not found — install via brew install ffmpeg");
    process.exit(1);
  }

  const videoDir = join(repoRoot, "reports/demo-video");
  const visualDir = join(repoRoot, "reports/demo-visual");
  ensureDir(videoDir);
  ensureDir(visualDir);

  const browser = await chromium.launch({ headless: true });
  const artifacts: Record<string, unknown>[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();

    await captureVisualRegression(page, "en", visualDir);

    for (const cap of CAPTURES) {
      const cfg = buildVideoRenderConfig(cap.target);
      const slug = `${cap.target}-${cap.tier}-${cap.locale}`;
      const basename = outputBasename(cap.target, cap.tier, cap.locale);
      const framesDir = join(videoDir, `frames-${slug}`);
      const mp4 = join(videoDir, `${basename}.mp4`);
      const webm = join(videoDir, `${basename}.webm`);
      const poster = join(videoDir, `${basename}-poster.jpg`);
      const vtt = join(videoDir, `${basename}.vtt`);

      await page.setViewportSize({ width: cfg.width, height: cfg.height });
      await page.goto(`${baseUrl}${cap.path}`, { waitUntil: "networkidle" });
      await dismissCookie(page);
      await setLocale(page, cap.locale);

      if (cap.target === "homepage") {
        await scrollToStory(page);
        await page.waitForSelector('[data-testid="homepage-candidate-story"]', { timeout: 15_000 });
        const playBtn = page.getByRole("button", { name: /play|odtwórz/i }).first();
        if (await playBtn.isVisible().catch(() => false)) await playBtn.click();
        await captureSceneFrames(
          page,
          cap.sequenceId,
          framesDir,
          '[data-testid="homepage-candidate-story"]',
          cap.tier,
        );
      } else {
        await page.waitForSelector("[data-demo-controls]", { timeout: 15_000 });
        const playBtn = page.getByRole("button", { name: /play|odtwórz/i }).first();
        if (await playBtn.isVisible().catch(() => false)) await playBtn.click();
        await captureSceneFrames(page, cap.sequenceId, framesDir, "[data-demo-scene]", cap.tier);
      }

      stitchVideo(framesDir, mp4, webm, cap.fps);
      extractPoster(mp4, poster);
      writeVtt(cap.sequenceId, cap.locale, vtt);

      const probe = ffprobeJson(mp4);
      const checksums = {
        mp4: sha256File(mp4),
        webm: sha256File(webm),
        poster: sha256File(poster),
      };
      const meta = {
        sha,
        previewUrl,
        timestamp: ts,
        target: cap.target,
        tier: cap.tier,
        locale: cap.locale,
        sequenceId: cap.sequenceId,
        durationMs: sequenceDurationMs(cap.sequenceId),
        width: cfg.width,
        height: cfg.height,
        fps: cap.fps,
        files: { mp4, webm, poster, vtt, framesDir },
        checksums,
        ffprobe: probe,
        status: existsSync(mp4) && statSync(mp4).size > 0 ? "RENDERED" : "FAILED",
      };
      writeFileSync(join(videoDir, `metadata-${slug}.json`), JSON.stringify(meta, null, 2));
      artifacts.push(meta);
      console.log(`✓ ${slug}: ${meta.status} (${statSync(mp4).size} bytes)`);

      if (cap.tier === "short") {
        const legacy = legacyBasename(cap.target, cap.locale);
        copyFileSync(mp4, join(videoDir, `${legacy}.mp4`));
        copyFileSync(webm, join(videoDir, `${legacy}.webm`));
        copyFileSync(poster, join(videoDir, `${legacy}-poster.jpg`));
        copyFileSync(vtt, join(videoDir, `${legacy}.vtt`));
        writeFileSync(join(videoDir, `metadata-${cap.target}-${cap.locale}.json`), JSON.stringify(meta, null, 2));
      }
    }

    const checksumManifest = artifacts.map((a) => {
      const m = a as { tier: string; target: string; locale: string; checksums: Record<string, string> };
      return { key: `${m.target}-${m.tier}-${m.locale}`, ...m.checksums };
    });
    writeFileSync(join(videoDir, `checksums-${sha}-${ts}.json`), JSON.stringify(checksumManifest, null, 2));

    const manifest = { sha, previewUrl, timestamp: ts, artifacts };
    writeFileSync(join(videoDir, `manifest-${sha}-${ts}.json`), JSON.stringify(manifest, null, 2));
    writeFileSync(
      join(videoDir, `render-commands-${ts}.md`),
      `# Demo video render @ ${sha}\n\nPreview: ${previewUrl}\n\n${artifacts.map((a) => `- ${(a as { target: string }).target}-${(a as { locale: string }).locale}: ${(a as { status: string }).status}`).join("\n")}\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
