#!/usr/bin/env npx tsx
/**
 * Render TWIN product film assets — `npm run demo:video:render`
 * Outputs MP4, WebM, poster WebP, and VTT for EN + PL.
 * Pass --force to re-render even when files exist.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { vttCaptions, type FilmLocale } from "../remotion/src/copy";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/demo");
const remotionEntry = join(root, "remotion/src/index.ts");
const force = process.argv.includes("--force");

const LOCALES: FilmLocale[] = ["en", "pl"];

function run(cmd: string): void {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function ensureDir(): void {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
}

function removeIfExists(path: string): void {
  if (existsSync(path)) unlinkSync(path);
}

async function renderLocale(locale: FilmLocale): Promise<void> {
  const composition = locale === "pl" ? "ProductFilmPL" : "ProductFilmEN";
  const base = `twin-product-film-${locale}`;
  const mp4Path = join(outDir, `${base}.mp4`);
  const webmPath = join(outDir, `${base}.webm`);
  const posterPath = join(outDir, `twin-product-film-poster-${locale}.webp`);
  const vttPath = join(outDir, `${base}.vtt`);
  const pngTemp = join(outDir, `twin-product-film-poster-${locale}.png`);

  if (force) {
    removeIfExists(mp4Path);
    removeIfExists(webmPath);
    removeIfExists(posterPath);
  }

  if (!existsSync(mp4Path) || force) {
    run(
      `npx remotion render ${remotionEntry} ${composition} ${mp4Path} --config remotion/remotion.config.ts`,
    );
  } else {
    console.log(`skip render (exists): ${mp4Path}`);
  }

  if (!existsSync(webmPath) || force) {
    run(`ffmpeg -y -i "${mp4Path}" -c:v libvpx-vp9 -b:v 2M -an "${webmPath}"`);
  } else {
    console.log(`skip webm (exists): ${webmPath}`);
  }

  run(
    `ffmpeg -y -i "${mp4Path}" -ss 3 -vframes 1 -vf "scale=1920:1080" -update 1 "${pngTemp}"`,
  );
  await sharp(pngTemp).webp({ quality: 85 }).toFile(posterPath);
  run(`rm -f "${pngTemp}"`);

  writeFileSync(vttPath, vttCaptions(locale), "utf8");
  console.log(`✓ ${locale}: mp4, webm, poster, vtt`);
}

async function main(): Promise<void> {
  ensureDir();
  for (const locale of LOCALES) {
    await renderLocale(locale);
  }
  console.log("All product film assets rendered.");
}

void main();
